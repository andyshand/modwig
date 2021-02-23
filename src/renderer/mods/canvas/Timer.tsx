import React, { useState, useEffect, useRef } from 'react';
import moment from 'moment'
import { TWITCH_CHAT_HEIGHT, TWITCH_CHAT_WIDTH } from './constants';
import { styled } from 'linaria/react'

const Wrap = styled.div`
    width: ${TWITCH_CHAT_WIDTH}px;
    position: fixed;
    top: ${TWITCH_CHAT_HEIGHT}px;
    height: 100px;
    right: 0;
    font-size: 1.7em;
    background: rgba( 0, 0, 0, .7);
    border-top: 2px solid #444;
    display: flex;
    align-items: center;
    border-bottom-left-radius: .3em;
    justify-content: center;
    overflow: hidden;
`
const Title = styled.div`
    margin-right: 1em;
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
        <Title>{title}</Title>
        <Time>{formatted}</Time>
        <TimerProgress percent={Math.round(fractionThrough * 100) + '%'} />
    </Wrap>
}