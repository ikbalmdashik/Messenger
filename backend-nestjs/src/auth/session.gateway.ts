import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnModuleDestroy } from '@nestjs/common';
import { Namespace, Socket } from 'socket.io';

import { AuthService } from './auth.service';
import { SessionEvent, SessionEventsService } from './session-events.service';

/**
 * Rooms
 *
 *   session:{id}  sockets whose ACTIVE account is
 *                 that session -> sign out at once.
 *   saved:{id}    sockets of browsers that keep the
 *                 session as a saved (non-active)
 *                 account -> refresh their list.
 *   user:{id}     sockets whose active account is
 *                 that user -> refresh "Where you're
 *                 logged in".
 */
const SESSION_ROOM = (id: number) => `session:${id}`;
const SAVED_ROOM = (id: number) => `saved:${id}`;
const USER_ROOM = (id: number) => `user:${id}`;

const readCookie = (header: string | undefined, name: string) => {
  if (!header) {
    return null;
  }

  for (const part of header.split(';')) {
    const index = part.indexOf('=');

    if (index === -1 || part.slice(0, index).trim() !== name) {
      continue;
    }

    const raw = part.slice(index + 1).trim();

    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  return null;
};

const readSavedTokens = (header: string | undefined): string[] => {
  const raw = readCookie(header, 'saved_sessions');

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (token): token is string =>
            typeof token === 'string' && token.length > 0,
        )
      : [];
  } catch {
    return [];
  }
};

/**
 * Live login / logout updates. Separate namespace
 * from chat, so these sockets don't affect presence.
 */
@WebSocketGateway({
  namespace: '/sessions',
  cors: { origin: true, credentials: true },
})
export class SessionGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  @WebSocketServer()
  server: Namespace;

  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly sessionEvents: SessionEventsService,
  ) {}

  afterInit() {
    this.unsubscribe = this.sessionEvents.subscribe((event) =>
      this.dispatch(event),
    );
  }

  onModuleDestroy() {
    this.unsubscribe?.();
  }

  async handleConnection(socket: Socket) {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const activeToken = readCookie(cookieHeader, 'access_token');

      if (activeToken) {
        const session = await this.authService.findValidToken(activeToken);

        if (session) {
          await socket.join([
            SESSION_ROOM(session.sessionId),
            USER_ROOM(session.userId),
          ]);
        } else {
          // Revoked while this page was closed.
          socket.emit('session_revoked', { sessionId: null });
        }
      }

      for (const token of readSavedTokens(cookieHeader)) {
        if (token === activeToken) {
          continue;
        }

        const session = await this.authService.findValidToken(token);

        if (session) {
          await socket.join(SAVED_ROOM(session.sessionId));
        }
      }
    } catch (error) {
      console.error('Session socket setup failed:', error);
      socket.disconnect(true);
    }
  }

  private dispatch(event: SessionEvent) {
    if (!this.server) {
      return;
    }

    if (event.type === 'revoked') {
      this.server
        .to(SESSION_ROOM(event.sessionId))
        .emit('session_revoked', { sessionId: event.sessionId });

      this.server
        .to(SAVED_ROOM(event.sessionId))
        .emit('saved_session_revoked', {
          sessionId: event.sessionId,
          userId: event.userId,
        });
    }

    this.server
      .to(USER_ROOM(event.userId))
      .emit('sessions_changed', { userId: event.userId });
  }
}
