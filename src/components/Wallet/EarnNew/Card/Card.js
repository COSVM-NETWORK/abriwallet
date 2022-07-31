import './Card.scss'

import { Loading } from 'components/common'

const Card = ({ loading, large, header, children, inactive, className }) => (
  <div className={`card-new ${large ? 'large' : ''} ${inactive ? 'inactive' : ''} ${className}`}>
    {header && <div className='header'>
      <span className='step'>{header.step}</span>
      <h2 className='title'>{header.title}</h2>
    </div>}
    {
      loading ?
        <Loading/>
        :
        <div className='content'>
          {children}
        </div>
    }
  </div>
)


export default Card
