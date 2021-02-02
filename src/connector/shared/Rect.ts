export const containsPoint = (rect, point) => {
    return point.x >= rect.x 
        && point.x < rect.x + rect.w 
        && point.y >= rect.y
        && point.y < rect.y + rect.h
}
export const containsX = (rect, x) => {
    return x >= rect.x 
        && x < rect.x + rect.w
}
export const containsY= (rect, y) =>{
    return y >= rect.y
        && y < rect.y + rect.h
}