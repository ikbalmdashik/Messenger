import { GeistProvider, CssBaseline } from '@geist-ui/core'

const App = ({ Component, pageProps }: any) => {
  return (
    <GeistProvider>
      <CssBaseline />
      <Component {...pageProps} />
    </GeistProvider>
  )
}

export default App