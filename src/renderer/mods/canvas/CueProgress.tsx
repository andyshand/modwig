import React from 'react'
import { styled } from 'linaria/react'
import moment from 'moment'

const Wrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    background: rgba( 0, 0, 0, 0.7);
    align-items: center;
    /* border-top: 2px solid #444; */
`
const Marker = styled.div`
    display: flex;
    width: 25%;
    justify-content: space-between;
    height: 4em;
    align-items: center;
    padding: .2em .5em;
    position: relative;
    color: #AAA;
    border-bottom: 2px solid #222;
    border-bottom: 2px solid #222;
    border-left: .5em solid ${(props: any) => props.color};
`
const Key = styled.div`
    background: rgba( 0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: .5em;
    color: #888;
    border-bottom-left-radius: .3em;
    > * {
        margin: 0 .7em;
    }
`
const MarkerDataWrap = styled.div`
    display: flex;
    align-items: center;
    color: #888;
    justify-content: flex-end;
    flex-direction: column;
    text-align: right;
`
const TrackInfo = styled.div`

`

const today = moment().startOf('day').toDate().getTime()
const MarkerData = ({ data }) => {
    const todaysEntry = data.entries.find(entry => entry.date === today)
    return <MarkerDataWrap>
        {moment.utc(data.duration).format('H:mm:ss')}
        {todaysEntry ? <div style={{color: 'green'}}>+{moment.utc(todaysEntry.duration).format('H:mm:ss')}</div> : null}
    </MarkerDataWrap>
}
export const CueProgress = ({cueMarkers: markers, totalProjectTime}) => {
    return <div>
    {/* <TrackInfo>
        Currently working on
        starjump - bounds
     </TrackInfo> */}
    <Wrap>
        {markers.map((marker, i) => {
            return <Marker key={marker.name + i} color={marker.color}>
                {marker.name}
                {marker.data ? <MarkerData data={marker.data} /> : null}
            </Marker>
        })}
    </Wrap>
    <Key>
        <span>Total project time: {moment.utc(totalProjectTime).format('H:mm:ss')}</span>
        <span>Yellow = unmixed</span>
        <span>Blue = rough mix</span>
        <span>Green = final mix</span>
    </Key>
    </div>
}