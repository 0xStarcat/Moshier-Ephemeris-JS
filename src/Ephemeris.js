import { kepler } from './utilities/kepler'
import Body from './classes/Body'
import Sol from './classes/Sol'
import Luna from './classes/Luna'
import Earth from './classes/Earth'
import HeliocentricOrbitalBody from './classes/HeliocentricOrbitalBody'
import Star from './classes/Star'
import Observer from './classes/Observer'
import {
  validateKey
} from './utilities/validators'

export default class Ephemeris {
  constructor({
    year=0, month=0, day=0, hours=0, minutes=0, seconds=0,
    latitude=0.00, longitude=0.00, height=0.00,
    key=undefined,
    moonQuarterApproximationValue=1.5
  }={}) {
    // Assumes UTC time
    // * int year (> 0 C.E.)
    // * int month (0 - 11 || 0 = January, 11 = December)
    // * int day (1 - 31)
    // * int hours (0 - 23)
    // * int minutes (0 - 59)
    // * int seconds (0 - 59)
    // * float latitude (-90 - +90)
    // * float longitude (-180 - +180)
    // * float height
    // * string OR array[string] key - ex: pass in "venus" or ["mercury", "venus"] or leave blank for all

    this._key = validateKey(key)

    this._moonQuarterApproximationValue = moonQuarterApproximationValue

    this.Observer = new Observer({latitude: latitude, longitude: longitude, height: height, year: year, month: month, day: day, hours: hours, minutes: minutes, seconds: seconds })

    this.Earth = new Earth(new Body('earth'), this.Observer.Date)

    this.Results = this.CalculateKeys()

    // Add each result as a key to the ephemeris object
    this.Results.forEach(result => {
      this[result.key] = result
    })

    this.CalculateKeys = this.CalculateKeys.bind(this)
    this.CalculateBody = this.CalculateBody.bind(this)
  }

  CalculateKeys() {
    return !!this._key && this._key.length ? // if key array
      Body.KeysExceptEarth.filter(b => this._key.includes(b.key)).map(b => this.CalculateBody(b.key)) :
      Body.KeysExceptEarth.map(b => this.CalculateBody(b.key))
  }

  CalculateBody(bodyKey) {
    const body = new Body(bodyKey)
    switch(body.type) {
      case 'sun':
        return new Sol(body, this.Earth, this.Observer)
      case 'luna':
        return new Luna({body: body, earthBody: this.Earth, observer: this.Observer, quarterApproximationValue: this._moonQuarterApproximationValue})
      case 'heliocentric':
        return new HeliocentricOrbitalBody(body, this.Earth, this.Observer)
      case 'star':
        return new Star(body, this.Earth, this.Observer)
      default:
        throw new Error(`Celestial body with key: "${bodyKey}" or type "${body.type}" not found.`)
        break
    }
  }

  // static CalculateDailyBody({startYear=0, startMonth=0, startDay=0, endYear=0, endMonth=0, endDay=0, hours=12, minutes=0, latitude=0.00, longitude=0.00, key=null}={}) {
  //   // Returns an array of ephemerii from startDate to endDate for 12pm noon UTC of each day
  //   // of the specific body
  //   const startDate = new Date(Date.UTC(startYear, startMonth, startDay, hours, minutes, 0))
  //   const endDate = new Date(Date.UTC(endYear, endMonth, endDay, hours, minutes, 0))
  //   const datesArray = []
  //
  //   let currentDate = new Date(startDate)
  //   while(currentDate <= endDate) {
  //     datesArray.push(new Date(currentDate))
  //     currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1))
  //   }
  //
  //   const ephemerisArray = datesArray.map(date => {
  //     return new Ephemeris(
  //       {
  //         year: date.getFullYear(),
  //         month: date.getMonth(),
  //         day: date.getDate(),
  //         hours: date.getHours(),
  //         minutes: date.getMinutes(),
  //         seconds: date.getSeconds(),
  //         latitude: latitude,
  //         longitude: longitude,
  //         key: key
  //       }
  //     )
  //   })
  //
  //   return ephemerisArray
  // }
}
