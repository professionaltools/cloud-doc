import React, {useState, useEffect} from "react"
import PropTypes from "prop-types"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faEdit, faTimes, faTrash} from "@fortawesome/free-solid-svg-icons"
import {faMarkdown} from "@fortawesome/free-brands-svg-icons"
import useKeyPress from "../hooks/useKeyPress"
import useContextMenu from "../hooks/useContextMenu"
import {getParentNode} from "../utils/helper"

const FileList = ({files, onFileClick, onSaveEdit, onFileDelete}) => {
  const [editStatus, setEditStatus] = useState(false)
  const [value, setValue] = useState("")
  const enterPressed = useKeyPress(13)
  const escPressed = useKeyPress(27)
  const clickedItem = useContextMenu([
    {
      label: "打开",
      click: () => {
        console.log("click", clickedItem.current)
        const parentElement = getParentNode(clickedItem.current, "file-item")
        if (parentElement) {
          const id = parentElement.dataset.id
          onFileClick(id)
        }
      }
    },
    {
      label: "编辑",
      click: () => {
        console.log("rename", clickedItem.current)
        const parentElement = getParentNode(clickedItem.current, "file-item")
        if (parentElement) {
          const id = parentElement.dataset.id
          const title = parentElement.dataset.title
          setEditStatus(id)
          setValue(title)
        }
      }
    },
    {
      label: "删除",
      click: () => {
        console.log("delete", clickedItem.current)
        const parentElement = getParentNode(clickedItem.current, "file-item")
        if (parentElement) {
          const id = parentElement.dataset.id
          onFileDelete(id)
        }
      }
    }
  ], '.file-list', [files])
  const closeSearch = (editItem) => {
    setEditStatus(false)
    setValue("")
    if (editItem.isNew) {
      onFileDelete(editItem.id)
    }
  }
  useEffect(() => {
    const editItem = files.find(file => file.id === editStatus)
    if (enterPressed && editStatus && value.trim() !== "") {
      onSaveEdit(editItem.id, value, editItem.isNew)
      setEditStatus(false)
      setValue("")
    }
    if (escPressed && editStatus) {
      closeSearch(editItem)
    }
  })
  useEffect(() => {
    const newFile = files.find(file => file.isNew)
    if (newFile) {
      setEditStatus(newFile.id)
      setValue(newFile.title)
    }
  }, [files])
  return (
    <ul className="list-group list-group-flush file-list">
      {
        files.map(file => (
          <li
            className="list-group-item bg-light row d-flex align-items-center file-item mx-0"
            key={file.id}
            data-id={file.id}
            data-title={file.title}
          >
            {
              (file.id !== editStatus && !file.isNew) &&
              <>
                 <span className="col-2">
                    <FontAwesomeIcon size="lg" icon={faMarkdown}/>
                 </span>
                <span
                  className="col-10 c-link"
                  onClick={() => {
                    onFileClick(file.id)
                  }}>
                  {file.title}
                </span>
                {/*<button*/}
                {/*type="button"*/}
                {/*className="col-2 icon-button"*/}
                {/*onClick={() => {*/}
                {/*setEditStatus(file.id)*/}
                {/*setValue(file.title)*/}
                {/*}}*/}
                {/*>*/}
                {/*<FontAwesomeIcon size="lg" title="编辑" icon={faEdit}/>*/}
                {/*</button>*/}
                {/*<button*/}
                {/*type="button"*/}
                {/*className="col-2 icon-button"*/}
                {/*onClick={() => {*/}
                {/*onFileDelete(file.id)*/}
                {/*}}*/}
                {/*>*/}
                {/*<FontAwesomeIcon size="lg" title="删除" icon={faTrash}/>*/}
                {/*</button>*/}
              </>
            }
            {
              (file.id === editStatus || file.isNew) &&
              <>
                <input
                  className="col-12"
                  value={value}
                  placeholder="请输入文件名称"
                  onChange={(e) => {
                    setValue(e.target.value)
                  }}/>
                {/*<button*/}
                {/*type="button"*/}
                {/*className="icon-button col-2"*/}
                {/*onClick={() => closeSearch(file)}*/}
                {/*>*/}
                {/*<FontAwesomeIcon title="关闭" icon={faTimes} size="lg"/>*/}
                {/*</button>*/}
              </>
            }
          </li>
        ))
      }
    </ul>
  )
}
FileList.propTypes = {
  files: PropTypes.array.isRequired,
  onFileClick: PropTypes.func,
  onFileDelete: PropTypes.func,
  onSaveEdit: PropTypes.func,
}
export default FileList
