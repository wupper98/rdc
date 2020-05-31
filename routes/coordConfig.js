const express = require('express')
var router = express.Router();

router.get('/', (req, res) => {
    res.render('coordConfig.ejs', {
        port: process.env.PORT,
        nomeutente: req.user.emails[0].value
    });
});

module.exports = router;