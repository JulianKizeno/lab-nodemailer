const session = require("express-session")
const bcrypt = require("bcrypt")
const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
const flash = require("connect-flash")

const User = require('../models/user.model')

module.exports = app => {

    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
        throw new Error("SESSION_SECRET must contain at least 32 characters")
    }

    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true, sameSite: "lax", secure: app.get("env") === "production" }
    }))

    passport.serializeUser((user, next) => next(null, user._id))
    passport.deserializeUser((id, next) => {
        User.findById(id)
            .then(theUser => next(null, theUser))
            .catch(err => next(err))
    })



    app.use(flash())

    passport.use(new LocalStrategy({ passReqToCallback: true }, (req, username, password, next) => {
        if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
            return next(null, false, { message: "Invalid credentials" })
        }
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