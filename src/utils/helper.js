export const flattenArr = function (arr) {
  return arr.reduce((map, cur) => {
    map[cur.id] = cur
    return map
  }, {})
}

export const objToArr = function (obj) {
  return Object.keys(obj).map(key => obj[key])
}
export const getParentNode = (node, parentClassName) => {
  let current = node
  while (current !== null) {
    if (current.classList.contains(parentClassName)) {
      return current
    }
    current = current.parentNode
  }
  return false
}
export const timestampToString = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}
