import { styled } from 'linaria/react'

export const Button = styled.button`
    -webkit-appearance: none;
    background: #EA6A10;
    color: white;
    font-size: 1em;
    padding: .5em 2em;
    margin: 0 auto;
    border: none;
    display: block;
    cursor: pointer;   
    outline: none !important;
    &:disabled {
        cursor: not-allowed;
        background: #666;
    }
    &:hover:not(:disabled) {
        filter: brightness(85%);
    }
    border-radius: .2em;
    margin-top: 1.6rem;
`