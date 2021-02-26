import React, { useState, useEffect, useRef } from 'react';
import moment from 'moment'
import { TWITCH_CHAT_HEIGHT, TWITCH_CHAT_WIDTH } from './constants';
import { styled } from 'linaria/react'

const Wrap = styled.div`
    width: ${TWITCH_CHAT_WIDTH}px;
    position: fixed;
    top: ${TWITCH_CHAT_HEIGHT}px;
    height: 115px;
    right: 0;
    font-size: 1.7em;
    background: rgba( 0, 0, 0, .7);
    border-top: 2px solid #444;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding-bottom: 1.5em;
    padding-top: 1em;
    box-shadow: inset 0 -10px 0 0 black;
`
const Title = styled.div`
    margin-right: 1em;
`
const Flex = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`
const TimerProgress = styled.div`
    background: #104c91;
    height: 10px;
    transition: width 1s;
    bottom: 0;
    position: absolute;
    left: 0;
    width: ${(props: any) => props.percent};
`
const CurrentlyWorking = styled.div`
  font-size: .6em;
  padding-top: .2em;
  color: #777;
`
const Time = styled.div``

function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      (savedCallback as any).current();
    }
    
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export const Timer = ({ to: toRaw, title, startedAt: startedAtRaw }) => {
    let to = new Date(toRaw)
    let startedAt = new Date(startedAtRaw)
    const calc = () => {
        return Math.max(0, to.getTime() - new Date().getTime())
    }
    const [msLeft, setMsLeft] = useState(calc())
    const fractionThrough = 1 - (msLeft / (to.getTime() - startedAt.getTime()))

    useInterval(() => {
        // update timer every second
        setMsLeft(calc())
    }, 1000)

    let formatted = moment.utc(msLeft).format('H:mm:ss')
    while (formatted[0] === '0' || formatted[0] === ':') {
        formatted = formatted.substr(1)
    }

    return <Wrap>
        <Flex>
          <Title>{title}</Title>
          <Time>{msLeft <= 0 ? 'Timer Complete 🎉' : formatted}</Time>
        </Flex>
        <CurrentlyWorking>currently working on
        starjump - bounds EP</CurrentlyWorking>
        <TimerProgress percent={Math.round(fractionThrough * 100) + '%'} />
    </Wrap>
}
