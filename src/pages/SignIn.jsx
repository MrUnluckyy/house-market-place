import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

import { ReactComponent as ArrowRightIcon } from '../assets/svg/keyboardArrowRightIcon.svg'
import visibilityIcon from '../assets/svg/visibilityIcon.svg'

import { toast } from 'react-toastify'
import OAuth from '../components/OAuth'

const SignIn = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const { email, password } = formData

  const navigate = useNavigate()

  const handleChange = (event) => {
    setFormData((prevState) => ({
      ...prevState,
      [event.target.id]: event.target.value,
    }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    try {
      const auth = getAuth()

      const userCretentials = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

      if (userCretentials.user) {
        navigate('/')
      }
    } catch (error) {
      toast.error('Bad User Credentials')
    }
  }

  return (
    <>
      <div className='pageContainer'>
        <header>
          <p className='pageHeader'>Welcome Back!</p>
        </header>
        <form onSubmit={onSubmit}>
          <input
            id='email'
            value={email}
            type='email'
            className='emailInput'
            placeholder='Your email'
            onChange={handleChange}
          />
          <div className='passwordInputDiv'>
            <input
              id='password'
              value={password}
              type={showPassword ? 'text' : 'password'}
              className='passwordInput'
              placeholder='Password'
              onChange={handleChange}
            />
            <img
              src={visibilityIcon}
              alt='show password'
              className='showPassword'
              onClick={() => setShowPassword((prevState) => !prevState)}
            />
          </div>
          <Link to='/forgot-password' className='forgotPasswordLink'>
            Forgot Password
          </Link>

          <div className='signInBar'>
            <p className='signInText'>Sign In</p>
            <button className='signInButton'>
              <ArrowRightIcon fill='#fff' width='34px' height='34px' />
            </button>
          </div>
        </form>
        <OAuth />
        <Link to='/sign-up' className='registerLink'>
          Sign Up Instead
        </Link>
      </div>
    </>
  )
}

export default SignIn
