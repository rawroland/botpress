import React from 'react'

import { updater } from '.'
import style from './style.scss'

export class Wrapper extends React.Component<WrapperProps> {
  handleMessageClicked = () => {
    updater.callback(this.props.messageId, true)
  }

  render() {
    return (
      <div className={style.hovering} onClick={this.handleMessageClicked}>
        {this.props.children}
      </div>
    )
  }
}

interface WrapperProps {
  messageId: string
  store: any
}
