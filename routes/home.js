const express = require('express')
const passport = require('passport') // isAuthenticated()
const bodyparser = require('body-parser')
var router = express.Router();

router.get('/', (req, res) => {
    res.render('home.ejs', {auth: req.isAuthenticated()});
});

module.exports = router;