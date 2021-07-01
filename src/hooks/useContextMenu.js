import {useEffect, useRef} from "react"

const {remote} = window.require("electron")
const {Menu, MenuItem} = remote

function useContextMenu(itemArr,targetSelector,deps) {
  let clickedElement = useRef(null)
  useEffect(() => {
    const menu = new Menu()
    itemArr.forEach(item => {
      menu.append(new MenuItem(item))
    })
    const handleContextMenu = (e) => {
      clickedElement.current = e.target
      if (document.querySelector(targetSelector).contains(e.target)) {
        menu.popup({window: remote.getCurrentWindow()})
      }
    }
    window.addEventListener("contextmenu", handleContextMenu)
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu)
    }
  }, deps)
  return clickedElement
}

export default useContextMenu
