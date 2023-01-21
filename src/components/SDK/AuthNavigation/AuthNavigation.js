import cn from 'classnames'

import { useSDKContext } from 'components/SDKProvider/SDKProvider'

import styles from './AuthNavigation.module.scss'

const AuthNavigation = ({ currentTab }) => {
  const { dappQuery } = useSDKContext()

  return (
    <div className={styles.wrapper}>
      <a
        href={`#/sdk/email-login${dappQuery}`}
        className={cn(styles.link, { [styles.linkActive]: currentTab === 'email-login' })}
      >
        <span className={styles.or}>or&nbsp;</span>
        Login with Email
      </a>
      <a href={`#/sdk/add-account${dappQuery}`} className={cn(styles.link, { [styles.linkActive]: currentTab === 'add-account' })}>
        <span className={styles.or}>or&nbsp;</span>
        Create Account
      </a>
    </div>
  )
}

export default AuthNavigation