// TODO: !!!CHANGE BUTTONS TO TOGGLES!!!

import { useState, useEffect, useRef } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.config'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'

import Spinner from '../components/Spinner'

const EditListing = () => {
  const [geolocationEnabled, setGeolocationEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [listing, setListing] = useState(null)
  const [formData, setFormData] = useState({
    type: 'rent',
    name: '',
    bedrooms: 1,
    bathrooms: 1,
    parking: false,
    furnished: false,
    address: '',
    offer: '',
    regularPrice: 0,
    discountedPrice: 0,
    images: {},
    latitude: 0,
    longitude: 0,
  })

  const {
    type,
    name,
    bedrooms,
    bathrooms,
    parking,
    furnished,
    address,
    offer,
    regularPrice,
    discountedPrice,
    images,
    latitude,
    longitude,
  } = formData

  const auth = getAuth()
  const navigate = useNavigate()
  const params = useParams()
  const isMounted = useRef(true)

  useEffect(() => {
    if (listing && listing.userRef !== auth.currentUser.uid) {
      toast.error('You can not edit that listing')
      navigate('/')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    const fetchListing = async () => {
      const docRef = doc(db, 'listings', params.listingId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setListing(docSnap.data())
        setFormData({ ...docSnap.data(), address: docSnap.data().location })
        setLoading(false)
      } else {
        navigate('/')
        toast.error('Listing does not exist')
      }
    }

    fetchListing()
  }, [params.listingId, navigate])

  useEffect(() => {
    if (isMounted) {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          setFormData({ ...formData, userRef: user.uid })
        } else {
          navigate('/')
        }
      })
    }

    return () => {
      isMounted.current = false
    }
  }, [isMounted])

  const onMutate = (event) => {
    let boolean = null

    if (event.target.value === 'true') {
      boolean = true
    }
    if (event.target.value === 'false') {
      boolean = false
    }

    if (event.target.files) {
      setFormData((prevState) => ({
        ...prevState,
        images: event.target.files,
      }))
    }

    if (!event.target.files) {
      setFormData((prevState) => ({
        ...prevState,
        [event.target.id]: boolean ?? event.target.value,
      }))
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    //Validation
    if (discountedPrice >= regularPrice) {
      setLoading(false)
      toast.error('Discounted price needs to be less than regular price')
      return
    }

    if (images.length > 6) {
      setLoading(false)
      toast.error('Max 6 images')
      return
    }
    // End of validation

    let geolocation = {}
    let location

    if (geolocationEnabled) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.REACT_APP_GEOCODE_API_KEY}`
      )

      const data = await response.json()
      geolocation.lat = data.results[0]?.geometry.location.lat ?? 0
      geolocation.lng = data.results[0]?.geometry.location.lng

      // Add dropdown to select address
      location =
        data.status === 'ZERO_RESULTS'
          ? undefined
          : data.results[0]?.formatted_address

      if (location === undefined || location.includes('undefined')) {
        setLoading(false)
        toast.error('Please enter a valid address')
        return
      }
    } else {
      geolocation.lat = latitude
      geolocation.lng = longitude
    }

    const storeImage = async (image) => {
      return new Promise((resolve, reject) => {
        const storage = getStorage()
        const fileName = `${auth.currentUser.uid}-${image.name}-${uuidv4()}`

        const storageRef = ref(storage, `images/${fileName}`)

        const uploadTask = uploadBytesResumable(storageRef, image)

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            console.log('Upload is ' + progress + '% done')
            switch (snapshot.state) {
              case 'paused':
                console.log('Upload is paused')
                break
              case 'running':
                console.log('Upload is running')
                break
              default:
                break
            }
          },
          (error) => {
            reject(error)
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              resolve(downloadURL)
            })
          }
        )
      })
    }

    const imgUrls = await Promise.all(
      [...images].map((image) =>
        storeImage(image).catch(() => {
          setLoading(false)
          toast.error('Something went wrong with image upload')
          return
        })
      )
    )

    const formDataCopy = {
      ...formData,
      imgUrls,
      geolocation,
      timestamp: serverTimestamp(),
    }

    formDataCopy.location = address
    delete formDataCopy.images
    delete formDataCopy.address

    // TODO: Enable this once location dropdown is implemented
    // location && (formDataCopy.location = location)

    !formDataCopy.offer && delete formDataCopy.discountedPrice

    const docRef = doc(db, 'listings', params.listingId)
    await updateDoc(docRef, formDataCopy)
    setLoading(false)

    toast.success('Listing has been created')
    navigate(`/category/${formDataCopy.type}/${docRef.id}`)
  }

  if (loading) {
    return <Spinner />
  }

  return (
    <div className='profile'>
      <header>
        <p className='pageHeader'>Edit a Listing</p>
      </header>
      <main>
        <form onSubmit={onSubmit}>
          <label htmlFor='' className='formLabel'>
            Sell / Rent
          </label>
          <div className='formButtons'>
            <button
              id='type'
              className={type === 'sale' ? 'formButtonActive' : 'formButton'}
              value='sale'
              onClick={onMutate}
            >
              Sell
            </button>
            <button
              id='type'
              className={type === 'rent' ? 'formButtonActive' : 'formButton'}
              value='rent'
              onClick={onMutate}
            >
              Rent
            </button>
          </div>
          <label className='formLabel'>Name</label>
          <input
            id='name'
            type='text'
            className='formInputName'
            value={name}
            onChange={onMutate}
            maxLength='32'
            minLength='10'
            required
          />
          <div className='forRooms flex'>
            <div>
              <label className='formLabel'>Bedrooms</label>
              <input
                id='bedrooms'
                type='number'
                className='formInputSmall'
                value={bedrooms}
                onChange={onMutate}
                min='1'
                max='50'
                required
              />
            </div>
            <div>
              <label className='formLabel'>Bathrooms</label>
              <input
                id='bathrooms'
                type='number'
                className='formInputSmall'
                value={bathrooms}
                onChange={onMutate}
                min='1'
                max='50'
                required
              />
            </div>
          </div>
          <label className='formLabel'>Parking spot</label>
          <div className='formButtons'>
            <button
              id='parking'
              className={parking ? 'formButtonActive' : 'formButton'}
              value={true}
              onClick={onMutate}
            >
              Yes
            </button>
            <button
              id='parking'
              className={
                !parking && parking !== null ? 'formButtonActive' : 'formButton'
              }
              value={false}
              onClick={onMutate}
            >
              No
            </button>
          </div>
          <label className='formLabel'>Furnished</label>
          <div className='formButtons'>
            <button
              id='furnished'
              className={furnished ? 'formButtonActive' : 'formButton'}
              value={true}
              onClick={onMutate}
            >
              Yes
            </button>
            <button
              id='furnished'
              className={
                !furnished && furnished !== null
                  ? 'formButtonActive'
                  : 'formButton'
              }
              value={false}
              onClick={onMutate}
            >
              No
            </button>
          </div>

          <label className='formLabel'>Address</label>
          <textarea
            id='address'
            className='formInputAddress'
            type='text'
            onChange={onMutate}
            value={address}
            required
          />
          {!geolocationEnabled && (
            <div className='formLatLng flex'>
              <div>
                <label className='formLabel'>Latitude</label>
                <input
                  id='latitude'
                  type='number'
                  className='formInputSmall'
                  value={latitude}
                  onChange={onMutate}
                  required
                />
              </div>
              <div>
                <label className='formLabel'>Longitude</label>
                <input
                  id='longitude'
                  type='number'
                  className='formInputSmall'
                  value={longitude}
                  onChange={onMutate}
                  required
                />
              </div>
            </div>
          )}
          <label className='formLabel'>Offer</label>
          <div className='formButtons'>
            <button
              id='offer'
              className={offer ? 'formButtonActive' : 'formButton'}
              value={true}
              onClick={onMutate}
            >
              Yes
            </button>
            <button
              id='offer'
              className={
                !offer && offer !== null ? 'formButtonActive' : 'formButton'
              }
              value={false}
              onClick={onMutate}
            >
              No
            </button>
          </div>
          <label className='formLabel'>Regular Price</label>
          <div className='formPriceDiv'>
            <input
              id='regularPrice'
              type='number'
              className='formInputSmall'
              value={regularPrice}
              onChange={onMutate}
              max='750000000'
              min='50'
              required
            />
            {type === 'rent' && <p className='formPriceText'>&#36; / Month</p>}
          </div>
          {offer && (
            <>
              <label className='formLabel'>Discounted Price</label>
              <input
                id='discountedPrice'
                type='number'
                className='formInputSmall'
                value={discountedPrice}
                onChange={onMutate}
                max='750000000'
                min='50'
                required={offer}
              />
            </>
          )}

          <label className='formLabel'>Images</label>
          <p className='imagesInfo'>
            The first image will be the cover (max6).
          </p>
          <input
            id='images'
            type='file'
            className='formInputFile'
            onChange={onMutate}
            max='6'
            accept='.jpg,.png,.jpeg'
            multiple
            required
          />
          <button type='submit' className='primaryButton createListingButton'>
            Edit Listing
          </button>
        </form>
      </main>
    </div>
  )
}

export default EditListing
