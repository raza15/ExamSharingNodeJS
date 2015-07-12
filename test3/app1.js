var express=require('express');
var bodyParser=require('body-parser');
var cookieParser=require('cookie-parser');
var expressSession=require('express-session');

var monk = require('monk');
var db = monk('localhost:27017/test3');

var mongoose = require('mongoose/');
mongoose.connect('mongodb://localhost/test3/data');

var app = express();

app.set('view engine', 'ejs');

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});

app.use(bodyParser());
app.use(cookieParser());
app.use(expressSession( {secret: process.env.SESSION_SECRET || 'secret'} ));

var Schema = mongoose.Schema;
var UserDetail = new Schema({
      username: String,
      password: String,
      userQuestions:[{text: String}],
      // examquest:[{text: String}],
      myexams: [{
        examquests:[{text: String}]
      }]
    }, {
      collection: 'userlist'
    });
var UserDetails = mongoose.model('userlist', UserDetail);

app.get('/', function(req, res) {
	
    // var db = req.db;
    // var collection = db.get('userlist');
    // UserDetails.findOne({"username":"raza"}, function(e, user) {
    // 	user.password = 'blah';
    // 	user.save(function(err) {
    //         if (err)
    //             console.log('error');
    //     }); 
    // });
    // res.send('ok');
    // collection.insert({
    //     "username" : "userName",
    //     "password" : "userEmail"
    // }, function (err, doc) {
    //     if (err) {
    //         // If it failed, return error
    //         res.send("There was a problem adding the information to the database.");
    //     }
    //     else {
    //     	res.send('hello world how are you hangin..??');
    //     }
    // });
});

var port = process.env.port || 3000;
app.listen(port, function() {
	console.log('listening on port '+port);
});

// passport.use('addQues',  new passportLocal.Strategy(function(username, password, done) {
//     process.nextTick(function() {
//         UserDetails.findOne({ 'username' :  username }, function(err, user) {
//             // if there are any errors, return the error
//             if (err)
//                 return done(err);

//             // check to see if theres already a user with that email
//             if (!user) {
//                 console.log('no user');
//                 return done(null, false);
//             } else {
//                 // this is full Jugar!!
//                 var item = {text: password};
//                 user.userQuestions.push(item);

//                 var item1 = {examquests: user.userQuestions};
//                 user.myexams.push(item1);


//                 user.save(function(err) {
//                     if (err)
//                         throw err;
//                     return done(null, user);
//                 });
//             }
//         });
//     });
// }));

// UserDetails.findById(req.user._id, function(err, p) {
//   if (!p)
//     return next(new Error('Could not load Document'));
//   else {
//     // do your updates here
//     // p.modified = new Date();
//     p.

//     p.save(function(err) {
//       if (err)
//         console.log('error')
//       else
//         console.log('success')
//     });
//   }
// });