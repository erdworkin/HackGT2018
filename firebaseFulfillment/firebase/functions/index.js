'use strict';

// Import the Dialogflow module from the Actions on Google client library.
const {dialogflow, Permission} = require('actions-on-google');

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

// Instantiate the Dialogflow client.
const app = dialogflow({debug: true});

const request = require('superagent');
//request.get('http://api.reimaginebanking.com/atms?key=8d321601bf805362b1df611430d1dc02');

const asyncCheckingAccountTask = () => request.get('http://api.reimaginebanking.com/accounts/59ff3e92b390353c953a2381?key=8d321601bf805362b1df611430d1dc02');
const asyncSavingsAccountTask = () => request.get('http://api.reimaginebanking.com/accounts/5bcb7655f0cec56abfa43dc8?key=8d321601bf805362b1df611430d1dc02');

// Handle the Dialogflow intent named 'favorite color'.
// The intent collects a parameter named 'color'.
app.intent('favorite color', (conv, {color}) => {
    const luckyNumber = color.length;
    // Respond with the user's lucky number and end the conversation.
    conv.close('Your lucky number is ' + luckyNumber);
});

app.intent('account balance', (conv) => {
    conv.ask('Which account, checking or savings?');
})
app.intent('checking account', (conv) => {
    return asyncCheckingAccountTask()
        .then((res) => {
            let message = 'Your checking account balance is ' + res.body.balance + ' dollars.';
            conv.ask(message)
        }).catch(() => conv.ask('Error, your checking account cannot be found right now. Try again later.'))
});
app.intent('savings account', (conv) => {
    return asyncSavingsAccountTask()
        .then((res) => {
            let message = 'Your savings account balance is ' + res.body.balance + ' dollars.';
            conv.ask(message);
        }).catch(() => conv.ask('Error, your savings account cannot be found right now. Try again later.'));
});

//pay a bill
const asyncGetBillToPayTask = () => request.get('http://api.reimaginebanking.com/customers/59fdd834a73e4942cdafe6e7/bills?key=8d321601bf805362b1df611430d1dc02');
const asyncPayBillTask = (billId, body) => request.put('http://api.reimaginebanking.com/bills/' + billId + '?key=8d321601bf805362b1df611430d1dc02', body);
app.intent('pay bill', (conv) => {
	return asyncGetBillToPayTask()
		.then((res) => {
			if(res.body.length > 0) {
			    let i = 0;
                while (res.body[i].type === 'completed') {
                    i++;
                }
			    let billId = res.body[i]._id;
			    let type = res.body[i].payee;
			    let date = res.body[i].payment_date;
			    const body = {
			        status: "completed"
			    };
			    return asyncPayBillTask(billId, body).then(res => {
			        conv.ask('Your '+ type +' bill due on '+ date +' has been paid!');
			    }).catch(res => {
			        conv.ask("Could not pay bill. Try again later");
			    });
			} else {
			    conv.ask("You don't have any bills!");
			}
		}).catch((res) => conv.ask('Sorry, your bills cannot be accessed' + res));
});

const asyncBillDueDateTask = () => request.get('http://api.reimaginebanking.com/customers/59fdd834a73e4942cdafe6e7/bills?key=8d321601bf805362b1df611430d1dc02');
app.intent('bill due', (conv) => {
    return asyncBillDueDateTask()
        .then((res) => {
            if (res.body && res.body.length > 0) {
                let i = 0;
                while (res.body[i].type === 'completed') {
                    i++;
                }
                let message = 'Your next bill is your '+ res.body[i].payee +' bill due on ' + res.body[i].payment_date;
                conv.ask(message);
            } else {
                let message = 'You do not currently have any bills.';
                conv.ask(message);
            }
        }).catch(() => conv.ask('Sorry, I cannot tell you when your bill is due right now.'));
});

// find nearest ATM
app.intent('atm ask permission', (conv) => {
    conv.data.requestedPermission = 'DEVICE_PRECISE_LOCATION';
    return conv.ask(new Permission({
        context: 'to find the nearest ATM',
        permissions: conv.data.requestedPermission,
    }));
});

const asyncAtmTask = (latitude, longitude) => request.get('http://api.reimaginebanking.com/atms?lat='+ latitude +'&lng='+ longitude +'&rad=370&key=3fe18e14b12a215ae3c25f2f40304ef5')
app.intent('atm ask permission - yes', (conv) => {
    const {latitude, longitude} = conv.device.location.coordinates;
    //conv.ask('your location is: ' + latitude + ',' + longitude);
        return asyncAtmTask(latitude, longitude)
         .then((res) => {
             let message = 'The closest atm is at ' + res.body.data[0].name + ' on ' + res.body.data[0].address.street_number + ' ' + res.body.data[0].address.street_name + ', ' + res.body.data[0].address.city + ', ' + res.body.data[0].address.state + ", " + res.body.data[0].address.zip
             conv.ask(message)
             })
         .catch(() => conv.ask('Sorry, there are no Capital One ATMs near you.'))
});

app.intent('atm ask permission - no', (conv) => {
    let message = 'Please provide your location to get a list of ATMs.'
    conv.close(message)
});

const asyncLoansTask = () => request.get('http://api.reimaginebanking.com/accounts/59ff3e92b390353c953a2381/loans?key=8d321601bf805362b1df611430d1dc02')
app.intent('total loans', (conv) => {
    return asyncLoansTask().then(res => {
        if (res.body.length > 0) {
            let total = 0;
            for(let loan of res.body) {
                total += loan.amount;
            }
            conv.ask("You have " + total + " dollars in  loans. Don't worry, you've got this!");
        } else {
            conv.ask("YOU'RE DEBT FREEEEEEEEEEEE!!! Congrats.");
        }
    }).catch(res => {
        conv.ask('We are sorry, we could not access your loan info.');
    });
})

app.intent('meaning of life', (conv) => {
    let message = '1 0 1 0 1 0';
    conv.ask(message);
});

app.intent('goodbye', (conv) => {
    // Respond with the user's lucky number and end the conversation.
    conv.close('Goodbye! Thanks for chatting!');
});

// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
