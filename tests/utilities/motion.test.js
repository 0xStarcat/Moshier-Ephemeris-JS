import {getDirectedDate, calculateNextRetrogradeStation, calculateNextDirectStation, calculateNextRetrogradeMoment, calculateNextDirectMoment } from '../../src/utilities/motion'

describe('getDirectedDate', () => {
  const utcDate = new Date(Date.UTC(2019, 9, 31, 0, 0)) // 10/31/2019 midnight UTC
  describe('errors', () => {
    it('throws invalid direction error', () => {
      expect(() => getDirectedDate({direction: 'bad direction', unit: 'date', utcDate})).toThrowError("Please pass in direction from the following: 'next' or 'prev'. Not \"bad direction\".")
    })

    it('throws invalid unit error', () => {
      expect(() => getDirectedDate({direction: 'next', unit: 'bad unit', utcDate})).toThrowError("Please pass in unit from the following: 'date', 'minute', or 'second'. Not \"bad unit\".")
    })
  })

  describe('next', () => {
    it('finds the next date', () => {
      const newDate = getDirectedDate({direction: 'next', unit: 'date', utcDate})
      expect(newDate).toEqual(new Date("2019-11-01T00:00:00.000Z")) // 11/1/2019 midnight UTC
    })

    it('finds the next minute', () => {
      const newDate = getDirectedDate({direction: 'next', unit: 'minute', utcDate})
      expect(newDate).toEqual(new Date("2019-10-31T00:01:00.000Z")) // 10/31/2019 00:01:00 UTC
    })

    it('finds the next second', () => {
      const newDate = getDirectedDate({direction: 'next', unit: 'second', utcDate})
      expect(newDate).toEqual(new Date("2019-10-31T00:00:01.000Z")) // 10/31/2019 00:00:01 UTC
    })
  })

  describe('prev', () => {
    it('finds the prev date', () => {
      const newDate = getDirectedDate({direction: 'prev', unit: 'date', utcDate})
      expect(newDate).toEqual(new Date("2019-10-30T00:00:00.000Z")) // 10/30/2019 midnight UTC
    })

    it('finds the prev minute', () => {
      const newDate = getDirectedDate({direction: 'prev', unit: 'minute', utcDate})
      expect(newDate).toEqual(new Date("2019-10-30T23:59:00.000Z")) // 10/30/2019 23:59 UTC
    })
  })
})

describe('calculateNextRetrogradeStation', () => {
  describe('in a direct datetime', () => {

    it('finds the next retrograde station', () => {
      const utcDate = new Date(Date.UTC(2019, 9, 31, 0, 0)) // direct 10/31/2019 midnight UTC
      const station = calculateNextRetrogradeStation({bodyKey: 'mercury', utcDate})

      expect(station.date).toEqual(new Date("2019-10-31T15:43:00.000Z")) // 10/31/2019 15:43 UTC
      expect(station.apparentLongitude).toEqual(237.6378590821993)
      expect(station.nextMovementAmount).toEqual(-5.9122839957126416e-8)

    })
  })

  describe('in a retrograde datetime', () => {

    it('finds the next retrograde station', () => {
      const utcDate = new Date(Date.UTC(2019, 9, 31, 20, 0)) // retrograde 10/31/2019 20:00 UTC
      const station = calculateNextRetrogradeStation({bodyKey: 'mercury', utcDate})

      expect(station.date).toEqual(new Date("2020-02-17T00:55:00.000Z")) // 2/17/2020 00:55 UTC
      expect(station.apparentLongitude).toEqual(342.88971141933405)
      expect(station.nextMovementAmount).toEqual(-2.8375666261126753e-8)

    })
  })
})

describe('calculateNextDirectStation', () => {
  describe('in a direct datetime', () => {
    it('finds the next direct station', () => {
      const utcDate = new Date(Date.UTC(2019, 9, 31, 0, 0)) // direct on 10/31/2019 midnight UTC
      const station = calculateNextDirectStation({bodyKey: 'mercury', utcDate})

      expect(station.date).toEqual(new Date("2019-11-20T19:13:00.000Z")) // 11/20/2019 19:13 UTC
      expect(station.apparentLongitude).toEqual(221.58646545546335)
      expect(station.nextMovementAmount).toEqual(6.07640515681851e-8)

    })
  })

  describe('in a retrograde datetime', () => {
    it('finds the next direct station', () => {
      const utcDate = new Date(Date.UTC(2019, 9, 31, 20, 0)) // retrograde on 10/31/2019 20:00 UTC
      const station = calculateNextDirectStation({bodyKey: 'mercury', utcDate})

      expect(station.date).toEqual(new Date("2019-11-20T19:13:00.000Z")) // 11/20/2019 19:13 UTC
      expect(station.apparentLongitude).toEqual(221.58646545546335)
      expect(station.nextMovementAmount).toEqual(6.07640515681851e-8)

    })
  })
})

describe('calculateNextRetrogradeMoment', () => {
  describe('in a direct datetime', () => {
    describe('next', () => {

      it('finds the next retrograde moment', () => {
        const utcDate = new Date(Date.UTC(2019, 9, 31, 0, 0)) // direct 10/31/2019 midnight UTC

        const moment = calculateNextRetrogradeMoment({bodyKey: 'mercury', utcDate, direction: 'next'})

        expect(moment.date).toEqual(new Date("2019-10-31T15:42:26.000Z")) // 10/31/2019 15:42:25 UTC

        expect(moment.apparentLongitude).toEqual(237.6378590865681)
        expect(moment.nextMovementAmount).toEqual(-1.4779288903810084e-12)

      })
    })

    describe('prev', () => {
      it('finds the prev retrograde moment', () => {
        const utcDate = new Date(Date.UTC(2019, 9, 31, 0, 0)) // direct 10/31/2019 midnight UTC

        const moment = calculateNextRetrogradeMoment({bodyKey: 'mercury', utcDate, direction: 'prev'})

        expect(moment.date).toEqual(new Date("2019-08-01T03:59:22.000Z")) // 8/01/2019 03:59:23 UTC

        expect(moment.apparentLongitude).toEqual(113.94763605057734)
        expect(moment.nextMovementAmount).toEqual(-7.673861546209082e-13)

      })
    })
  })

  describe('in a retrograde datetime', () => {
    it('returns the given retrograde moment', () => {
      const utcDate = new Date(Date.UTC(2019, 9, 31, 20, 0)) // retrograde on 10/31/2019 20:00 UTC

      const moment = calculateNextRetrogradeMoment({bodyKey: 'mercury', utcDate})

      expect(moment.date).toEqual(new Date("2019-10-31T20:00:00.000Z")) // 10/31/2019 20:00 UTC

      expect(moment.apparentLongitude).toEqual(237.63563852193388)
      expect(moment.nextMovementAmount).toEqual(-2.883943750475737e-7)
    })
  })
})

describe('calculateNextDirectMoment', () => {
  describe('in a direct datetime', () => {
    it('returns the given direct moment', () => {
      const utcDate = new Date(Date.UTC(2019, 9, 31, 0, 0)) // direct 10/31/2019 midnight UTC

      const moment = calculateNextDirectMoment({bodyKey: 'mercury', utcDate})

      expect(moment.date).toEqual(new Date("2019-10-31T00:00:00.000Z")) // 10/31/2019 00:00 UTC

      expect(moment.apparentLongitude).toEqual(237.60866592301215)
      expect(moment.nextMovementAmount).toEqual(0.0000010243777808227605)

    })
  })

  describe('in a retrograde datetime', () => {
    describe('next', () => {

      it('finds the next direct moment', () => {
        const utcDate = new Date(Date.UTC(2019, 9, 31, 20, 0)) // retrograde on 10/31/2019 20:00 UTC

        const moment = calculateNextDirectMoment({bodyKey: 'mercury', utcDate, direction: 'next'})

        expect(moment.date).toEqual(new Date("2019-11-20T19:12:37.000Z")) // 11/20/2019 19:13 UTC

        expect(moment.apparentLongitude).toEqual(221.58646545567194)
        expect(moment.nextMovementAmount).toEqual(2.8421709430404007e-11)

      })
    })

    describe('prev', () => {
      it('finds the prev direct moment', () => {
        const utcDate = new Date(Date.UTC(2019, 9, 31, 20, 0)) // retrograde on 10/31/2019 20:00 UTC

        const moment = calculateNextDirectMoment({bodyKey: 'mercury', utcDate, direction: 'prev'})

        expect(moment.date).toEqual(new Date("2019-10-31T15:42:54.000Z")) // 10/31/2019 15:42 UTC

        expect(moment.apparentLongitude).toEqual(237.63785908449577)
        expect(moment.nextMovementAmount).toEqual(3.271338755439501e-11)

      })
    })
  })
})
