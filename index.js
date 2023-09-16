const express = require('express');
const app = express();
const axios = require('axios');
const session = require('express-session');
const fs = require("fs");
const cors = require('cors');
const formidable = require('formidable');
const {parse} = require("path");
const path = require("path");

app.use(cors());

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

function doesPasswordContainSpecialCharacters(password) {

    let character = "!@#$%^&*()<>/?,.~`';";

    for (let i = 0; i <= password.length; i++) {
        if (character.includes(password[i])) {
            return true;
        }
    }
    return false;
}

function doesPasswordContainCaptialAlphabet(password) {
    let capitalAlphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let i = 0; i <= password.length; i++) {

        if (capitalAlphabets.includes(password[i])) {
            return true;
        }

    }
    return false;
}

const findUser = (email, users, userFound, notExist) => {
    let foundIndex = -1;

    for (let i = 0 ; i < users.length ; i++) {
        if (users[i].email === email) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex === -1) { // Not Exist
        notExist();
    } else {
        userFound(foundIndex, users[foundIndex]);
    }
}

app.get('/', (req, res) => {
    const data = {

    };
    if (req.session.user_do_not_exists === true) {
        data.user_do_not_exists = true;
        delete req.session.user_do_not_exists;
    } else if (req.session.user_registered === true) {
        data.user_registered = true;
        delete req.session.user_registered;
    }

    res.render('screens/main_page/main_page' , {
        data: data
    });
});

app.get('/dashboard' , (req , res) => {
    const data = {

    }
    if (req.session.user_registered === true) {
        data.user_registered = true;
        delete req.session.user_registered;
    } else if (req.session.withdraw_success === true) {
        data.withdraw_success = true;
        delete req.session.withdraw_success;
    } else if (req.session.deposit_success === true) {
        data.deposit_success = true;
        delete req.session.deposit_success;
    } else if (req.session.check_balance === true) {
        data.check_balance = true;
        delete req.session.check_balance;
    } else if (req.session.send === true) {
        data.send = true;
        data.amount_sent = req.session.amount_sent;
        data.remaining_amount = req.session.remaining_amount;
        data.receipent_name = req.session.receipent_name;
        delete req.session.send;
    } else if (req.session.user_do_not_exists === true) {
        data.user_do_not_exists = true;
        delete req.session.user_do_not_exists;
    } else if (req.session.cancel_transaction === true) {
        data.cancel_transaction = true;
        delete req.session.cancel_transaction;
    } else if (req.session.insufficient_balance === true) {
        data.insufficient_balance = true;
        delete req.session.insufficient_balance;
    } else if (req.session.invalid_password === true) {
        data.invalid_password = true;
        delete req.session.invalid_password;
    } else if (req.session.masg === true) {
        data.masg = true;
        data.data = req.session.data;
        data.amount = req.session.amount_transfered;
        delete req.session.masg;
        delete req.session.amount_transfered;
    } else if (req.session.bank_does_not_exists === true) {
        data.bank_does_not_exists = true;
        delete req.session.masg;
    }

    res.render('screens/dashboard/dashboard', {
        user: { ...req.session.user },
        data: data
    });
    // console.log(users);
});

app.get('/register_page', (req, res) => {
    const data = {

    }
    if (req.session.invalid_password !== undefined && req.session.invalid_password === true) {
        data.invalid_password = true;
        delete req.session.invalid_password;
    } else if (req.session.user_already_exists === true) {
        data.user_already_exists = true;
        delete req.session.user_already_exists;
    }  else if (req.session.enter_complete_data === true) {
        data.enter_complete_data = true;
        delete req.session.enter_complete_data;
    }
    res.render('screens/register_page/register_page', {
        data: data
    });
});

app.post('/register' , (req, res) => {

    const form = new formidable.IncomingForm()

    form.parse(req, (err, fields, files) => {

        const {img: [{mimetype, filepath, originalFilename}]} = files;
        const { first_name: [firstName], last_name: [lastName], email: [userEmail], password: [userPassword], amount: [userAmount] } = fields;

        const checkSpecialCharacter = doesPasswordContainSpecialCharacters(userPassword);
        const checkCapitalAlphabet = doesPasswordContainCaptialAlphabet(userPassword);

        if(userPassword.length < 8) {
            req.session.invalid_password = true;
            res.redirect('/register_page');
        } else if (firstName === "") {
            req.session.enter_complete_data = true;
            res.redirect('/register_page');
        } else if (lastName === "") {
            req.session.enter_complete_data = true;
            res.redirect('/register_page');
        }else if (userEmail === "") {
            req.session.enter_complete_data = true;
            res.redirect('/register_page');
        } else if(checkSpecialCharacter === false) {
            req.session.invalid_password = true;
            res.redirect('/register_page');
        } else if(checkCapitalAlphabet === false) {
            req.session.invalid_password = true;
            res.redirect('/register_page');
        } else {

            try {
                const data = fs.readFileSync('users.txt' , 'utf8');
                const info = JSON.parse(data);

                findUser(
                    userEmail, info,
                    (i, user) => {
                        req.session.user_already_exists = true;
                        res.redirect('/register_page');
                    },
                    () => {
                        info.push({
                            first_name: firstName,
                            last_name: lastName,
                            email: userEmail,
                            password: userPassword,
                            amount: parseInt(userAmount),
                            image: originalFilename
                        });

                        //console.log(path.join(__dirname, "/public/user_images" , originalFilename));
                        // console.log(files.img[0]);

                        try {
                            fs.existsSync(__dirname + "/public/user_images");
                            if (mimetype === "image/png") {
                                console.log(path.join(__dirname, "/public/user_images/" + originalFilename));
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            } else if (mimetype === "image/jpg") {
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            } else if (mimetype === "image/jpeg") {
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            }
                        } catch {
                            fs.mkdirSync(__dirname + "/public/user_images");
                            if (mimetype === "image/png") {
                                console.log(path.join(__dirname, "/public/user_images/" + originalFilename));
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            } else if (mimetype === "image/jpg") {
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            } else if (mimetype === "image/jpeg") {
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            }
                        }

                        fs.writeFileSync('users.txt' , JSON.stringify(info) , 'utf8');
                        req.session.user_registered = true;
                        res.redirect('/');
                    }
                )
            } catch (err) {
                if (err.code === 'ENOENT') {
                    try {
                        fs.writeFileSync('users.txt' , JSON.stringify([{
                            first_name: firstName,
                            last_name: lastName,
                            email: userEmail,
                            password: userPassword,
                            amount: parseInt(userAmount),
                            image: originalFilename
                        }]) , 'utf8');


                        try {
                            fs.existsSync(__dirname + "/public/user_images");
                            if (mimetype === "image/png") {
                                console.log(path.join(__dirname, "/public/user_images/" + originalFilename));
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            } else if (mimetype === "image/jpg") {
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            } else if (mimetype === "image/jpeg") {
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            }
                        } catch {
                            fs.mkdirSync(__dirname + "/public/user_images");
                            if (mimetype === "image/png") {
                                console.log(path.join(__dirname, "/public/user_images/" + originalFilename));
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            } else if (mimetype === "image/jpg") {
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            } else if (mimetype === "image/jpeg") {
                                fs.writeFileSync(path.join(__dirname, "/public/user_images/" + originalFilename), fs.readFileSync(filepath));
                            }
                        }

                        req.session.user_registered = true;
                        res.redirect('/');
                    } catch (err) {
                        console.log("Error in making file");
                    }
                }
            }
        }

    });

});

app.get('/login_page', (req, res) => {
    let data = {

    };

    if (req.session.invalid_password === true) {
        data.invalid_password = true;
        delete req.session.invalid_password;
    }

    res.render('screens/login_page/login_page' , {
        data: data
    });
});

app.post('/login' , (req , res) => {

    const form = new formidable.IncomingForm()

    form.parse(req, (err, fields, files) => {

        const {
            email: [userEmail],
            password: [userPassword],
        } = fields;

        try {
            const data = fs.readFileSync('users.txt', 'utf8');
            const info = JSON.parse(data);

            findUser(
                userEmail, info,
                (i, user) => {
                    if (user.password !== userPassword) {
                        req.session.invalid_password = true;
                        res.redirect('/login_page');
                    } else {
                        req.session.user = user;
                        res.redirect('/dashboard');
                    }
                },
                () => {
                    req.session.user_do_not_exists = true;
                    res.redirect('/');
                }
            );

        } catch (err) {
            console.log("File does not exists");
        }

    });
});

app.get('/deposit', (req, res) => {
    let data = {

    }
    if (req.session.invalid_amount === true) {
        data.invalid_amount = true;
        delete req.session.invalid_amount;
    }
    res.render('screens/deposit/deposit' , {
        data: data
    });
});

app.post('/deposit_amount', (req, res) => {

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {

        const {
            amount: [amount]
        } = fields;

        let user = { ...req.session.user }

        if (amount <= 0) {
            req.session.invalid_amount = true;
            res.redirect('/deposit');
        } else {

            try {
                const data = fs.readFileSync('users.txt', 'utf8');
                const info = JSON.parse(data);

                findUser(
                    user.email, info,
                    (i, user) => {
                        info[i] = {
                            ...user,
                            amount: info[i].amount + parseInt(amount)
                        }

                        fs.writeFileSync('users.txt' , JSON.stringify(info) , 'utf8');
                        req.session.deposit_success = true;
                        res.redirect('/dashboard');
                    },
                    () => {
                        req.session.user_do_not_exists = true;
                        res.redirect('/');
                    }
                );

            } catch (err) {
                console.log("File does not exists");
            }
        }


    });

});

app.get('/withdraw', (req, res) => {
    let data = {

    }

    if (req.session.invalid_amount === true) {
        data.invalid_amount = true;
        delete req.session.invalid_amount;
    }

    res.render('screens/withdraw/withdraw' , {
        data: data
    });
});

app.post('/withdraw_amount', (req, res) => {

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {

        const {
            amount: [amount]
        } = fields;

        let user = { ...req.session.user }

        if (amount <= 0) {
            req.session.invalid_amount = true;
            res.redirect('/deposit');
        }  else if (user.amount < amount) {
            req.session.insufficient_balance = true;
            res.redirect('/dashboard');
        } else {

            try {
                const data = fs.readFileSync('users.txt', 'utf8');
                const info = JSON.parse(data);

                findUser(
                    user.email, info,
                    (i, user) => {
                        info[i] = {
                            ...user,
                            amount: info[i].amount - parseInt(amount)
                        }

                        fs.writeFileSync('users.txt' , JSON.stringify(info) , 'utf8');
                        req.session.withdraw_success = true;
                        res.redirect('/dashboard');
                    },
                    () => {
                        req.session.user_do_not_exists = true;
                        res.redirect('/');
                    }
                );

            } catch (err) {
                console.log("File does not exists");
            }
        }


    });

});

app.post('/transfer_money', (req, res) => {

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {

        const {
            bank: [bank]
        } = fields;

        res.render('screens/transfer_money/transfer_money' , {
            bank: bank
        });
    });
});

app.post('/transfer', (req, res) =>  {

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {

        const loginUser = { ...req.session.user };

        const {
            email: [email],
            amount: [amount],
            password: [password],
            bank: [bank]
        } = fields;

        if (bank === "hbl") {

            const formData = new FormData();
            formData.append('email', email);
            formData.append('amount', amount);

            if(parseInt(amount) <= 0) {
                req.session.invalid_amount = true;
                res.redirect('/other_bank');
            } else if (parseInt(loginUser.amount) >= parseInt(amount)) {
                if (password === loginUser.password) {
                    axios
                        .post('http://localhost:8000/transfer', formData , {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        })
                        .then(response => {
                            // console.log(response);
                            if (response.data.status === true) {
                                req.session.data = response.data.masg;
                                req.session.masg = true;

                                try {
                                    const data = fs.readFileSync('users.txt' , 'utf8');
                                    const info = JSON.parse(data);
                                    findUser(
                                        loginUser.email , info,
                                        (i , user) => {
                                            info[i].amount -= amount;
                                            req.session.amount_transfered = info[i].amount;
                                        },
                                        () => {}
                                    );
                                    fs.writeFileSync('users.txt' , JSON.stringify(info) , 'utf8');
                                } catch (err) {
                                    console.log("Error in editing the file!!!")
                                }
                                req.session.amount_sent = true;
                                res.redirect('/dashboard');
                            }
                        })
                        .catch(err => {
                            req.session.data = err.response.data.masg;
                            req.session.masg = true;
                            res.redirect('/dashboard');
                        });
                } else {
                    req.session.invalid_password = true;
                    res.redirect('/other_bank');
                }
            } else {
                req.session.insufficient_balance = true;
                res.redirect('/other_bank');
            }

        } else if(bank === "meezan_bank") {

            let newAmountForSender;

            if(parseInt(amount) <= 0) {
                req.session.invalid_amount = true;
                res.redirect('/other_bank');
            } else if (parseInt(loginUser.amount) >= parseInt(amount)) {
                if (loginUser.password === password) {
                    try {
                        const data = fs.readFileSync('users.txt' , 'utf8');
                        const info = JSON.parse(data);
                        findUser(
                            email, info,
                            (i, user) => {
                                const newAmountForSender = loginUser.amount - amount;
                                const newAmountForRecipent = parseInt(info[i].amount) + parseInt(amount);
                                info[i].amount = newAmountForRecipent;
                                loginUser.amount = newAmountForSender;
                                req.session.send = true;
                                req.session.amount_sent = parseInt(amount);
                                req.session.remaining_amount = newAmountForSender;
                                req.session.receipent_name = info[i].first_name;
                                findUser(
                                    loginUser.email , info,
                                    (i, user) => {
                                        info[i].amount -= amount;
                                    },
                                    () => {}
                                );
                                fs.writeFileSync('users.txt' , JSON.stringify(info) , 'utf8');
                                // req.session.amount_sent = true;
                                res.redirect('/dashboard');
                            },
                            () => {
                                req.session.user_do_not_exists = true;
                                res.redirect('/dashboard');
                            }
                        );
                    } catch (err) {
                        console.log("File does not exists");
                    }
                } else {
                    req.session.invalid_password = true;
                    res.redirect('/dashboard');
                }
            } else {
                req.session.insufficient_balance = true;
                res.redirect('/dashboard');
            }
        } else {
            req.session.bank_does_not_exists = true;
            res.redirect('/dashboard');
        }

    });

});

app.get('/check_balance', (req, res) => {
    let user = { ...req.session.user };

    try {
        const data = fs.readFileSync('users.txt', 'utf8');
        const info = JSON.parse(data);

        findUser(
            user.email, info,
            (i, user) => {
                req.session.user = user;
            },
            () => {}
        );

    } catch (err) {
        console.log("File does not exists");
    }

    req.session.check_balance = true;

    res.redirect('/dashboard');
});

app.get('/quit', (req, res) => {
    res.render('screens/quit/quit');
});

app.get('/logout', (req, res) => {
    res.redirect('/');
});

app.post('/password', (req, res) => {

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {

        const {
            email: [email],
            amount: [amount],
            bank: [bank]
        } = fields;

        let foundIndex = false;

        try {
            const data = fs.readFileSync('users.txt' , 'utf8');
            const info = JSON.parse(data);
            findUser(
                email, info,
                (i, user) => {
                    firstName = user.first_name;
                    foundIndex = true;
                },
                () => {}
            );
        } catch (err) {
            console.log('File does not exists!');
        }

        if (email === "") {
            req.session.enter_complete_data = true;
            res.redirect('/other_bank');
        } else if (amount === null) {
            req.session.enter_complete_data = true;
            res.redirect('/other_bank');
        } else if (foundIndex === false) {
            req.session.user_do_not_exists = true;
            res.redirect('/dashboard');
        } else if (amount <= 0) {
            req.session.invalid_amount = true;
            res.redirect('/other_bank');
        } else {
            let firstName;

            try {
                const data = fs.readFileSync('users.txt' , 'utf8');
                const info = JSON.parse(data);
                findUser(
                    email, info,
                    (i, user) => {
                        firstName = user.first_name;
                    },
                    () => {}
                );
            } catch (err) {
                console.log('File does not exists!');
            }

            res.render('screens/password/password' , {
                email: email,
                amount: amount,
                bank: bank,
                first_name: firstName
            });
        }
    });

});

app.get('/cancel', (req, res) => {
    req.session.cancel_transaction = true;
    res.redirect('/dashboard');
});

app.get('/other_bank', (req, res) => {
    let data = {

    }

    if (req.session.invalid_amount === true) {
        data.invalid_amount = true;
        delete req.session.invalid_amount;
    } else if (req.session.user_do_not_exists === true) {
        data.user_do_not_exists = true;
        delete req.session.user_do_not_exists;
    } else if (req.session.invalid_password === true) {
        data.invalid_password = true;
        delete req.session.invalid_password;
    } else if (req.session.enter_complete_data === true) {
        data.enter_complete_data = true;
        delete req.session.enter_complete_data;
    }

    console.log(data);

    res.render('screens/other_bank/other_bank' , {
        data: data
    });
});

app.get('/admin', (req, res) => {
    const data = {

    }
    if (req.session.delete === true) {
        data.delete = true;
        delete req.session.delete;
    }

    try {
        const data = fs.readFileSync('users.txt' , 'utf8');
        const info = JSON.parse(data);
        res.render('screens/admin/admin' , {
            data: data,
            users: info
        });
    } catch (err) {
        console.log('File does not exists!');
    }

});

app.get('/delete/:i', (req, res) => {
    index = parseInt(req.params.i);

    try {
        const data = fs.readFileSync('users.txt' , 'utf8');
        const info = JSON.parse(data);
        fs.unlinkSync(__dirname + "/public/user_images/" + info[index].image);
        info.splice(index , 1);
        fs.writeFileSync('users.txt' , JSON.stringify(info) , 'utf8');
        req.session.delete = true;
        res.redirect('/admin');
    } catch (err) {
        console.log('File does not exists!');
    }
});

app.listen(2000, () => {
    console.log(`Example app listening on port 2000`)
});