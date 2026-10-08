import { useEffect, useState } from 'react'
import { installButtonClicks } from './audio/mixer'
import { CreateScreen, GameOver, Shell } from './ui/play'
import { useGame } from './state/store'

export function App() {
  const state = useGame()
  const [ready] = useState(true)
  useEffect(() => { installButtonClicks() }, [])
  if (!ready) return null
  if (!state.meta.created) return <CreateScreen />
  if (state.meta.gameOver) return <GameOver state={state} />
  return <Shell state={state} />
}
