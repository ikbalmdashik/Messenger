import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export type SessionEvent =
  | { type: 'created'; userId: number; sessionId: number }
  | { type: 'revoked'; userId: number; sessionId: number };

/**
 * In-process bus between AuthService (which changes
 * sessions) and SessionGateway (which tells the
 * affected browsers). Keeps the two from depending
 * on each other directly.
 */
@Injectable()
export class SessionEventsService {
  private readonly emitter = new EventEmitter();

  emit(event: SessionEvent) {
    this.emitter.emit('session', event);
  }

  subscribe(listener: (event: SessionEvent) => void) {
    this.emitter.on('session', listener);

    return () => {
      this.emitter.off('session', listener);
    };
  }
}
