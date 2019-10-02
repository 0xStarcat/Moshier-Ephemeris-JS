import { constant } from './utilities/constant'
import { body } from './utilities/body'
import { kepler } from './utilities/kepler'
import { processor } from './utilities/processor'
import  { julian } from './utilities/julian'
import { delta } from './utilities/delta'
import { sun } from './utilities/sun'
import { moon } from './utilities/moon'
import { planet } from './utilities/planet'
import { star } from './utilities/star'

import {
  validateYear,
  validateMonth,
  validateDate,
  validateHour,
  validateMinute,
  validateSecond,
  validateLatitude,
  validateLongitude,
  validateNumber
} from './utilities/validators'


export default class Ephemeris {
  constructor({ year=0, month=0, day=0, hours=0, minutes=0, seconds=0, latitude=0.00,  longitude=0.00, height=0.00 }={}) {
    // !!!UTC time!!!
    // * int year (> 0 C.E.)
    // * int month (0 - 11 || 0 = January, 11 = December)
    // * int day (1 - 31)
    // * int hours (0 - 23)
    // * int minutes (0 - 59)
    // * int seconds (0 - 59)
    // * float latitude (-90 - +90)
    // * float longitude (-180 - +180)
    // * float height

    this._year = validateYear(year)
    this._month = validateMonth(month) // Reconcile month to use 1 - 12 range with legacy code
    this._day = validateDate(day)
    this._hours = validateHour(hours)
    this._minutes = validateMinute(minutes)
    this._seconds = validateSecond(seconds)
    this._latitude = validateLatitude(latitude)
    this._longitude = validateLongitude(longitude)
    this._height = validateNumber(height)

    this.Constant = constant
    this.Constant.date = { year: this._year, month: this._month, day: this._day, hours: this._hours, minutes: this._minutes, seconds: this._seconds }
    this.Constant.tlong = longitude
    this.Constant.glat = latitude
    this.Constant.height = height
    this.Constant = kepler.init(constant)

    this.CalculateDates()



    this.Body = body
    this.Earth = kepler.calc(this.Constant.date, this.Body.find(b => b.key === 'earth'))
    this.Results = this.CalculateResults()

    this.CalculateDates = this.CalculateDates.bind(this)
    this.CalculateResults = this.CalculateResults.bind(this)
    this.CalculateBody = this.CalculateBody.bind(this)
  }

  CalculateDates() {
    const dateObject = { year: this._year, month: this._month, day: this._day, hours: this._hours, minutes: this._minutes, seconds: this._seconds }

    this.Date = new Date(Date.UTC(this._year, this._month, this._day, this._hours, this._minutes, this._seconds))

    this.JulianDate = julian.calcJulianDate({...dateObject, month: dateObject.month + 1}) // month + 1 for formula
    this.J2000 = julian.calcJ2000(this.JulianDate)
    this.B1950 = julian.calcB1950(this.JulianDate)
    this.J1900 = julian.calcJ1900(this.JulianDate)

    // TODO - deprecate Constant.date references and use the above above.
    // TODO - refeactor kepler, precess, etc and only pass in julian date as arg
    this.Constant.date.julian = julian.calcJulianDate({...dateObject, month: dateObject.month + 1}) // month + 1 for formula
    this.Constant.date.j2000 = julian.calcJ2000(this.JulianDate)
    this.Constant.date.b1950 = julian.calcB1950(this.JulianDate)
    this.Constant.date.j1900 = julian.calcJ1900(this.JulianDate)

    this.Constant.date = delta.calc(this.Constant.date, this.Constant) // TODO - refactor Date to be its own class with these methods on init
    this.Constant.date = julian.universalCalc(this.Constant.date) // TODO - refactor Date to be its own class with these methods on init
  }

  CalculateResults() {
    return this.Body.filter(b => b.key !== 'earth').map(b => this.CalculateBody(b.key))
  }

  CalculateBody(bodyKey) {
    const bodyObject = this.Body.find(b => b.key === bodyKey)
    switch(bodyObject.type) {
      case 'sun':
        return sun.calc(bodyObject, {...this.Earth}, this.Constant)
      case 'luna':
        return moon.calc(bodyObject, {...this.Earth}, this.Constant)
      case 'heliocentric':
        return planet.calc(bodyObject, {...this.Earth}, this.Constant)
      case 'star':
        return star.calc(bodyObject, {...this.Earth}, this.Constant)
      default:
        throw new Error(`Celestial body with key: "${bodyKey}" or type "${bodyObject.type}" not found.`)
        break
    }
  }
}
