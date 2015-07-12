var express=require('express');
var bodyParser=require('body-parser');
var cookieParser=require('cookie-parser');
var expressSession=require('express-session');

var mongoose = require('mongoose/');
mongoose.connect('mongodb://localhost/test3/data');

var monk = require('monk');
var db = monk('localhost:27017/test3');

var passport=require('passport');
var passportLocal=require('passport-local');

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

app.use(passport.initialize());
app.use(passport.session());

var Schema = mongoose.Schema;
var UserDetail = new Schema({
    name:String,
    username: String,
    password: String,
    userQuestionsids:[{questionid: String}],
    shareExamsWith:[{username:String}],
    myexams: [{
        Examname:String,
        examquests:[{text: String, solution:String, lines:String}] 
    }]
}, {
    collection: 'userlist'
});
var UserDetails = mongoose.model('userlist', UserDetail);

var Question = new Schema({
    question:String,
    solution:String,
    username:String,
    name:String,
    lines:String
}, {
    collection:'questionlist'    
});
var Questions = mongoose.model('questionlist', Question);

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

passport.use('local-login', new passportLocal.Strategy({
		usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
	}, 
	function(req, username, password, done) {
	process.nextTick(function() {
	    UserDetails.findOne({'username': username}, function(err, user) {
		    if (err) {
	        	return done(err);
	      	}
	 
	      	if (!user) {
	        	return done(null, false);
	      	}
		    if (user.password != password) {
		        return done(null, false);
		    }
		 	return done(null, user);
	    });
	});
}));

app.get('/', function(req, res) {
	res.render('index1');
}); 


app.post('/login', passport.authenticate('local-login', {
	successRedirect: '/home', // redirect to the secure profile section
	failureRedirect: '/', // redirect back to the signup page if there is an error
}));

app.post('/signup', function(req,res) {
    UserDetails.findOne({ 'username' :  req.body.username }, function(err, user) {
        // if there are any errors, return the error
        if (err)
            res.send('error');

        // check to see if theres already a user with that email
        if (user) {
            res.send('Username Already Exists. Choose a different Username');
        } else {
            var newUser            = new UserDetails();

            if(req.body.password==req.body.conform) {

                if(req.body.password.length>4) {
                    newUser.name = req.body.name;
                    newUser.username = req.body.username;
                    newUser.password = req.body.password;
                    // save the user
                    newUser.save(function(err) {});
                    res.send('New User Created. Please Log In');
                } else {
                    res.send('Password too Short. Please Choose One with Atleast 5 Characters.');
                }
            } else {
                res.send('Passwords Donot Match! Please Try Again');
            }
        }
    });
});

app.get('/home', function(req,res) {
    UserDetails.find(function(err, users) {
        var arr = new Array();
        for(i=0; i<users.length; i++) {
            var a = 0;
            for(j=0; j<req.user.shareExamsWith.length; j++) {
                if(users[i].username == req.user.shareExamsWith[j].username) {
                    a = 1;
                }
            }
            if(users[i].username!=req.user.username && a == 0) {
                arr.push(users[i].username);
            }
        }
        var l = arr.length;
        res.render('home', {
            person:req.user,
            arr:JSON.stringify(arr),
            l:l
        });
    });
});


app.get('/person', function(req,res) {
    res.redirect('/person/0');
});

app.get('/person/:page', function(req, res) {
    // console.log(x);
    Questions.find({'username':req.user.username}, function(e, questions) {
        res.render('person', {
            person:req.user.name,
            questions:questions,
            page:parseInt(req.params.page)
        });
    });
});

app.get('/myexams', function(req, res) {
    res.redirect('/myexams/0');
});

app.get('/myexams/:page', function(req, res) {
    Questions.find(function(err, questions) {
        var arr = new Array();
        for(i=0; i<questions.length; i++) {
            arr.push(questions[i].question);
        }
        
        res.render('myexams', {
            person:req.user.name,
            myexams:req.user.myexams,
            page:parseInt(req.params.page),
            arr:JSON.stringify(arr)
        });
    }); 
});


app.get('/allques', function(req,res) {
    res.redirect('/allques/0');
});

app.get('/allques/:page', function(req, res) {
    Questions.find(function(err, questions) {
        res.render('allques', {questions:questions, person:req.user.name,page:parseInt(req.params.page)});
    }); 
});

app.get('/changePassword', function(req, res) {
	res.render('changePassword', {
		person:req.user.name,
	});
});

app.post('/changePassword', function(req, res) {
    UserDetails.findOne({"username":req.user.username}, function(e, user) {
        if(req.body.oldpassword===req.user.password) {
            user.password = req.body.newpassword;
        }
        user.save(function(err) {
            if (err)
                console.log('error');
        }); 
    });
    res.redirect('/changePassword');
});

app.post('/addQues', function(req,res) {
    var _id;
    if(req.body.ques.length!=0) {
        req.db.get('questionlist').insert({'question':req.body.ques,'solution':req.body.sol, 
            'username':req.user.username,'name':req.user.name, 'lines':req.body.lines},  function(err, doc) {
            if(err) {
                console.log('error');
            }
            _id = doc._id.toString();
        });
        // var id=_id;

        UserDetails.findOne({"username":req.user.username}, function(e, user) {
            var item = {questionid: _id};
            user.userQuestionsids.push(item);
            user.save(function(err) {
                if (err)
                    console.log('error');
            }); 
        });
    }
    res.redirect('/person/'+(parseInt((req.user.userQuestionsids.length-1)/5)*5)); 
});

app.post('/UsersToShareExamsWith', function(req,res) {
    var v = {username:req.body.UserNaam};
    req.user.shareExamsWith.push(v);
    UserDetails.findOne({"username":req.user.username}, function(e, user) {
        user.shareExamsWith.push(v);
        user.save(function(err) {
            if (err)
                console.log('error');
        }); 
        res.redirect('/home');
    });
});

app.get('/othersExams',function(req,res) {
    res.redirect('/othersExams/'+0);
});

app.get('/othersExams/:page',function(req,res) {
    UserDetails.find(function(err, users) {
        var user = req.user.username;
        var _users = new Array();
        for(i=0; i<users.length; i++) {
            for(j=0; j<users[i].shareExamsWith.length; j++) {
                if(users[i].shareExamsWith[j].username==user) {
                    for(k=0;k<users[i].myexams.length;k++) {
                    _users.push({username:users[i].username, Examnum:k+1, Examname:users[i].myexams[k].Examname, examquests:users[i].myexams[k].examquests });
                    }
                }
            }
        }
        // console.log(arr[0]);
        res.render('othersExams', {
            users:_users,
            person:req.user.name,
            page:parseInt(req.params.page)
        });
    }); 
});

app.post('/:k/addexam', function(req, res) {
    var txt;
    var sol;
    var lnes;
    var Ename;
    if(req.params.k==0) {
        txt=req.body.question;
        sol=req.body.solution;
        lnes=req.body.lines;
        Ename=req.body.examname;
        var item=[{text:txt,solution:sol, lines:lnes}];
        var item1={Examname:Ename, examquests:item};
        
        req.user.myexams.push(item1);
        UserDetails.findOne({"username":req.user.username}, function(e, user) {
            user.myexams.push(item1);
            user.save(function(err) {
                if (err)
                    console.log('error');
            }); 
        });
        res.redirect('/myexams/'+(parseInt((req.user.myexams.length-1)/5)*5));
    } else if(req.params.k==1) {
        Ename=req.body.examname;
        Questions.findOne({"question":req.body.question1}, function(e, q) {
            if(e || !q) {
                res.send('No Question Found');
            } else {
                // console.log('working');
                txt=q.question;
                sol=q.solution;
                lnes=q.lines;
            }
            // console.log(txt+' '+sol+' '+lnes);
            var item=[{text:txt,solution:sol, lines:lnes}];
            // console.log('item = '+item);
            var item1={Examname:Ename, examquests:item};
            req.user.myexams.push(item1);
            UserDetails.findOne({"username":req.user.username}, function(e, user) {
                user.myexams.push(item1);
                user.save(function(err) {
                    if (err)
                        console.log('error');
                }); 
            });
            res.redirect('/myexams/'+(parseInt((req.user.myexams.length-1)/5)*5));
        });                
    }
});

app.get('/examPdf/:id', function(req,res) {
    // console.log(req.user.myexams[req.params.id].length);
    res.render('examPdf', {
        person:req.user.username,
        exam:req.user.myexams[req.params.id],
        examnum:req.params.id
    });
});

app.get('/examSol/:id', function(req,res) {
    // console.log(req.user.myexams[req.params.id].length);
    res.render('examSol', {
        person:req.user.username,
        exam:req.user.myexams[req.params.id],
        examnum:req.params.id
    });
});

app.get('/addQtoE/:id', function(req,res) {
    UserDetails.findOne({"_id":req.user._id}, function(e, user) {
        Questions.find(function(err, questions) {
            var arr = new Array();
            for(i=0; i<questions.length; i++) {
                arr.push(questions[i].question);
            }
            res.render('addQtoE', {arr:JSON.stringify(arr), person:req.user, examnum:req.params.id});
        }); 
    }); 
});

app.post('/:k/addQtoE/:id', function(req, res) {
    var item;
    if(req.params.k==0) {
        item = {text:req.body.question,solution:req.body.solution, lines:req.body.lines};
        // just so that we dont have to logout/login again to see the result
        req.user.myexams[req.params.id].examquests.push(item);
        //
        UserDetails.findOne({"username":req.user.username}, function(e, user) {
            user.myexams[req.params.id].examquests.push(item);
            user.save(function(err) {
                if (err)
                    console.log('error');
            }); 
            res.redirect('/addQtoE/'+req.params.id);
        });    
    } else if(req.params.k==1) {
        Questions.findOne({"question":req.body.question}, function(e, q) {
            if(!q) {
                res.send('No Question Found. Please Try Again');
            } else {
                item = {text:q.question,solution:q.solution, lines:q.lines};

                req.user.myexams[req.params.id].examquests.push(item);
                UserDetails.findOne({"username":req.user.username}, function(e, user) {
                    user.myexams[req.params.id].examquests.push(item);
                    user.save(function(err) {
                        if (err)
                            console.log('error');
                    }); 
                    
                });
                res.redirect('/addQtoE/'+req.params.id);
            }
        });
    }
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/fail', function(req, res) {
    res.send('not working bro');
});

var port = process.env.port || 3000;
app.listen(port, function() {
	console.log('listening on port '+port);
});
