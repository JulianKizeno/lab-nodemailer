
// Configure a strong deployment secret; development uses an ephemeral secret.
const sessionSecret = process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== 'production' ? require('crypto').randomBytes(32).toString('hex') : null)
if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters')
}
const session = require("express-session")
const bcrypt = require("bcrypt")
const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
const flash = require("connect-flash")

const User = require('../models/user.model')

module.exports = app => {

    app.use(session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }
    }))

    passport.serializeUser((user, next) => next(null, user._id))
    passport.deserializeUser((id, next) => {
        User.findById(id)
            .then(theUser => next(null, theUser))
            .catch(err => next(err))
    })



    app.use(flash())

    passport.use(new LocalStrategy({ passReqToCallback: true }, (req, username, password, next) => {
        User.findOne({ username })
            .then(user => {
                if (!user) {
                    return next(null, false, { message: "Nombre de usuario incorrecto" })
                }
                if (!bcrypt.compareSync(password, user.password)) {
                    return next(null, false, { message: "Contraseña incorrecta" })
                }
                return next(null, user)
            })
            .catch(err => next(err))
    }))

    app.use(passport.initialize())
    app.use(passport.session())
}