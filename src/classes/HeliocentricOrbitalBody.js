import { B1950, RTD } from '../constants'

import { aberration } from '../utilities/aberration'
import { altaz } from '../utilities/altaz'
import { constellation } from '../utilities/constellation'
import { deflection } from '../utilities/deflection'
import Epsilon from '../utilities/Epsilon'
import { kepler } from '../utilities/kepler'
import { light } from '../utilities/light'
import { lonlat } from '../utilities/lonlat'
import { nutation } from '../utilities/nutation'
import { precess } from '../utilities/precess'
import { util } from '../utilities/util'
import { getApparentLongitude, getDirectedDate, getApparentLongitudeDifference } from '../utilities/motion'
import Ephemeris from '../Ephemeris'

export default class HeliocentricOrbitalBody {
  constructor(body, earthBody, observer, calculateMotion) {
    this._earthBody = earthBody
    this._observer = observer
    this._calculateMotion = calculateMotion
    this._body = this.calculateBody(body, this._earthBody, this._observer)
    Object.keys(this._body).filter(k => k !== '_body').forEach(key => {
      this[key] = this._body[key]
    })

    this.calculateBody = this.calculateBody.bind(this)
    this.reduceBody = this.reduceBody.bind(this)
    this.calculateMotion = this.calculateMotion.bind(this)

    if (calculateMotion) {
      this.calculateMotion(body, observer)
    }
  }

  calculateBody(body, earthBody, observer) {
    if (!body.semiAxis) {
  		body.semiAxis = body.perihelionDistance / (1 - body.eccentricity);
  	}

  	/* calculate heliocentric position of the object */
  	body = kepler.calc(observer.Date.julian, body); // NOTE mutates body
  	/* apply correction factors and print apparent place */
  	return this.reduceBody(body, body.position.rect, earthBody.position.rect, earthBody, observer);
  }

  calculateMotion(body, observer) {
    this.motion = {}

    this.motion.nextMinuteApparentLongitude = getApparentLongitude(body.key, getDirectedDate({direction: "next", unit: "minute", utcDate: observer.Date.utc}), observer)

    this.motion.nextMinuteApparentLongitudeDifference = getApparentLongitudeDifference(this.position.apparentLongitude, this.motion.nextMinuteApparentLongitude)

    this.motion.isRetrograde = !!(this.motion.nextMinuteApparentLongitudeDifference < 0)

    // console.log(this._observer.Date.utc,
    //   this.position.apparentLongitude,
    //   this.motion.nextMinuteApparentLongitude, this.motion.nextMinuteApparentLongitudeDifference,
    // this.motion.isRetrograde)


    this.motion.nextRetrogradeDate
    this.motion.prevRetrogradeDate

    this.motion.nextRetrogradeApparentLongitude
    this.motion.withinPreRetrogradeShadow

    this.motion.prevRetrogradeApparentLongitude
    this.motion.withinPostRetrogradeShadow
  }

  reduceBody(body, q, e, earthBody, observer) {
  	var p = [], temp = [], polar = []; // double
  	var a, b, r, s, x; // double
  	var i; // int

  	/* Save the geometric coordinates at TDT
  	 */
  	for ( i=0; i<3; i++ ) {
  		temp[i] = q[i];
  	}

  	/* Display ecliptic longitude and latitude, precessed to equinox
  	 of date.  */
  	body.equinoxEclipticLonLat = lonlat.calc(q, observer.Date, polar, 1 );

  	/* Adjust for light time (planetary aberration)
  	 */
  	light.calc( body, q, e, earthBody, observer); // NOTE mutates body

  	/* Find Euclidean vectors between earth, object, and the sun
  	 */
  	for( i=0; i<3; i++ ) {
  		p[i] = q[i] - e[i];
  	}

  	body = util.angles( p, q, e, body );

  	a = 0.0;
  	for( i=0; i<3; i++ ) {
  		b = temp[i] - e[i];
  		a += b * b;
  	}
  	a = Math.sqrt(a);
  	body.position.trueGeocentricDistance = a; /* was EO */
  	body.position.equatorialDiameter = 2.0*body.semiDiameter / body.locals.EO;

  	/* Calculate radius.
  	 */
  	r = 0.0;
  	x = 0.0;
  	for( i=0; i<3; i++ ) {
  		x = p[i];
  		r += x * x;
  	}
  	r = Math.sqrt(r);

  	/* Calculate visual magnitude.
  	 * "Visual" refers to the spectrum of visible light.
  	 * Phase = 0.5(1+pq) = geometric fraction of disc illuminated.
  	 * where pq = cos( sun-object-earth angle )
  	 * The magnitude is
  	 *    V(1,0) + 2.5 log10( SE^2 SO^2 / Phase)
  	 * where V(1,0) = elemnt->mag is the magnitude at 1au from
  	 * both earth and sun and 100% illumination.
  	 */
  	a = 0.5 * (1.0 + body.locals.pq);
  	/* Fudge the phase for light leakage in magnitude estimation.
  	 * Note this phase term estimate does not reflect reality well.
  	 * Calculated magnitudes of Mercury and Venus are inaccurate.
  	 */
  	b = 0.5 * (1.01 + 0.99*body.locals.pq);
  	s = body.magnitude + 2.1715 * Math.log( body.locals.EO * body.locals.SO ) - 1.085 * Math.log(b);
  	body.position.approxVisual = {
  		magnitude: s,
  		phase: a
  	};

  	/* Find unit vector from earth in direction of object
  	 */
  	for( i=0; i<3; i++ ) {
  		p[i] /= body.locals.EO;
  		temp[i] = p[i];
  	}

  	/* Report astrometric position
  	 */
  	body.position.astrometricJ2000 = util.showrd (p, polar );

  	/* Also in 1950 coordinates
  	 */
  	temp = precess.calc ( temp, B1950, -1 );
  	body.position.astrometricB1950 = util.showrd (temp, polar );

  	/* Correct position for light deflection
  	 */
  	body.position.deflection = deflection.calc ( p, q, e, body ); // relativity

  	/* Correct for annual aberration
  	 */
  	body.position.aberration = aberration.calc(p, earthBody, observer, body);

  	/* Precession of the equinox and ecliptic
  	 * from J2000.0 to ephemeris date
  	 */
  	p = precess.calc( p, observer.Date.julian, -1 );

  	/* Ajust for nutation
  	 * at current ecliptic.
  	 */

  	// const epsilonObject = new Epsilon(observer.Date.julian); // NOTE - has no affect on result
  	body.position.nutation = nutation.calc ( observer.Date, p ); // NOTE mutates p

  	/* Display the final apparent R.A. and Dec.
  	 * for equinox of date.
  	 */
  	body.position.constellation = constellation.calc (p, observer.Date);
  	body.position.apparent = util.showrd(p, polar);

  	/* Geocentric ecliptic longitude and latitude.  */
  	for( i=0; i<3; i++ ) {
  		p[i] *= body.locals.EO;
  	}
  	body.position.apparentGeocentric = lonlat.calc ( p, observer.Date, temp, 0 );
  	body.position.apparentLongitude = body.position.apparentGeocentric [0] * RTD;
  	body.position.apparentLongitudeString =
  		body.position.apparentGeocentric [3].degree + '\u00B0' +
  		body.position.apparentGeocentric [3].minutes + '\'' +
  		Math.floor (body.position.apparentGeocentric [3].seconds) + '"'
  	;

  	body.position.apparentLongitude30String =
  		util.mod30(body.position.apparentGeocentric [3].degree) + '\u00B0' +
  		body.position.apparentGeocentric [3].minutes + '\'' +
  		Math.floor(body.position.apparentGeocentric [3].seconds) + '"'
  	;

  	body.position.geocentricDistance = r;

  	/* Go do topocentric reductions.
  	 */
  	polar[2] = body.locals.EO;
  	body.position.altaz = altaz.calc(polar, observer.Date, body, observer);

    return body
  }
}

export const planet = {};

planet.calc = (body, earthBody, observer) => {
	body = planet.prepare(body);

	/* calculate heliocentric position of the object */
	body = kepler.calc(observer.Date.julian, body); // NOTE mutates body
	/* apply correction factors and print apparent place */
	return planet.reduce(body, body.position.rect, earthBody.position.rect, earthBody, observer);
};

/* The following program reduces the heliocentric equatorial
 * rectangular coordinates of the earth and object that
 * were computed by kepler() and produces apparent geocentric
 * right ascension and declination.
 */
planet.reduce = (body, q, e, earthBody, observer) => {
	var p = [], temp = [], polar = []; // double
	var a, b, r, s, x; // double
	var i; // int

	/* Save the geometric coordinates at TDT
	 */
	for ( i=0; i<3; i++ ) {
		temp[i] = q[i];
	}

	/* Display ecliptic longitude and latitude, precessed to equinox
	 of date.  */
	body.equinoxEclipticLonLat = lonlat.calc(q, observer.Date, polar, 1 );

	/* Adjust for light time (planetary aberration)
	 */
	light.calc( body, q, e, earthBody, observer); // NOTE mutates body

	/* Find Euclidean vectors between earth, object, and the sun
	 */
	for( i=0; i<3; i++ ) {
		p[i] = q[i] - e[i];
	}

	body = util.angles( p, q, e, body );

	a = 0.0;
	for( i=0; i<3; i++ ) {
		b = temp[i] - e[i];
		a += b * b;
	}
	a = Math.sqrt(a);
	body.position.trueGeocentricDistance = a; /* was EO */
	body.position.equatorialDiameter = 2.0*body.semiDiameter / body.locals.EO;

	/* Calculate radius.
	 */
	r = 0.0;
	x = 0.0;
	for( i=0; i<3; i++ ) {
		x = p[i];
		r += x * x;
	}
	r = Math.sqrt(r);

	/* Calculate visual magnitude.
	 * "Visual" refers to the spectrum of visible light.
	 * Phase = 0.5(1+pq) = geometric fraction of disc illuminated.
	 * where pq = cos( sun-object-earth angle )
	 * The magnitude is
	 *    V(1,0) + 2.5 log10( SE^2 SO^2 / Phase)
	 * where V(1,0) = elemnt->mag is the magnitude at 1au from
	 * both earth and sun and 100% illumination.
	 */
	a = 0.5 * (1.0 + body.locals.pq);
	/* Fudge the phase for light leakage in magnitude estimation.
	 * Note this phase term estimate does not reflect reality well.
	 * Calculated magnitudes of Mercury and Venus are inaccurate.
	 */
	b = 0.5 * (1.01 + 0.99*body.locals.pq);
	s = body.magnitude + 2.1715 * Math.log( body.locals.EO * body.locals.SO ) - 1.085 * Math.log(b);
	body.position.approxVisual = {
		magnitude: s,
		phase: a
	};

	/* Find unit vector from earth in direction of object
	 */
	for( i=0; i<3; i++ ) {
		p[i] /= body.locals.EO;
		temp[i] = p[i];
	}

	/* Report astrometric position
	 */
	body.position.astrometricJ2000 = util.showrd (p, polar );

	/* Also in 1950 coordinates
	 */
	temp = precess.calc ( temp, B1950, -1 );
	body.position.astrometricB1950 = util.showrd (temp, polar );

	/* Correct position for light deflection
	 */
	body.position.deflection = deflection.calc ( p, q, e, body ); // relativity

	/* Correct for annual aberration
	 */
	body.position.aberration = aberration.calc(p, earthBody, observer, body);

	/* Precession of the equinox and ecliptic
	 * from J2000.0 to ephemeris date
	 */
	p = precess.calc( p, observer.Date.julian, -1 );

	/* Ajust for nutation
	 * at current ecliptic.
	 */

	// const epsilonObject = new Epsilon(observer.Date.julian); // NOTE - has no affect on result
	body.position.nutation = nutation.calc ( observer.Date, p ); // NOTE mutates p

	/* Display the final apparent R.A. and Dec.
	 * for equinox of date.
	 */
	body.position.constellation = constellation.calc (p, observer.Date);
	body.position.apparent = util.showrd(p, polar);

	/* Geocentric ecliptic longitude and latitude.  */
	for( i=0; i<3; i++ ) {
		p[i] *= body.locals.EO;
	}
	body.position.apparentGeocentric = lonlat.calc ( p, observer.Date, temp, 0 );
	body.position.apparentLongitude = body.position.apparentGeocentric [0] * RTD;
	body.position.apparentLongitudeString =
		body.position.apparentGeocentric [3].degree + '\u00B0' +
		body.position.apparentGeocentric [3].minutes + '\'' +
		Math.floor (body.position.apparentGeocentric [3].seconds) + '"'
	;

	body.position.apparentLongitude30String =
		util.mod30(body.position.apparentGeocentric [3].degree) + '\u00B0' +
		body.position.apparentGeocentric [3].minutes + '\'' +
		Math.floor(body.position.apparentGeocentric [3].seconds) + '"'
	;

	body.position.geocentricDistance = r;

	/* Go do topocentric reductions.
	 */
	polar[2] = body.locals.EO;
	body.position.altaz = altaz.calc(polar, observer.Date, body, observer);

  return body
};

planet.prepare = body => {
	if (!body.semiAxis) {
		body.semiAxis = body.perihelionDistance / (1 - body.eccentricity);
	}

  return body
};
