var express = require('express');
var validate = require('uuid-validate');
var cors = require('cors');
var router = express.Router();

router.all('*', cors());

// holds mapping from account_id to list of transactions
const account_store = require('data-store')('account')

// holds mapping of transaction_id to account_id
const transaction_store = require('data-store')('transaction')

// make sure everything is empty on init
account_store.clear()
transaction_store.clear()

router.post('/amount', function(req, res) {
  const { account_id, amount } = req.body
  const transaction_id = req.headers['transaction-id']

  if (req.headers['content-type'] != 'application/json') {
    res.status(415).send('Specified content type not allowed.')
    return
  }

  if (!account_id || !validate(account_id) || !amount || !Number.isInteger(amount)) {
    res.status(400).send('Mandatory body parameters missing or have incorrect type.')
    return
  }

  if (transaction_store.has(transaction_id)) {
    res.status(200).send('Operation accepted.')
    return;
  }
  
  transaction_store.set(transaction_id, account_id)

  account_store.union(account_id, {
    transaction_id,
    account_id,
    amount
  })

  res.status(200).send('Operation accepted.')
});

router.all('/amount', (req, res) => {
  res.status(405).send('Specified HTTP method not allowed.')
})

router.get('/balance/:id', function(req, res) {
  const account_id = req.params.id

  if (!account_store.has(account_id)) {
    res.status(404).send('Account not found.')
    return
  }

  const transactions = account_store.get(account_id)

  const amount = transactions
    .reduce((acc, t) => {
      return acc + t.amount
    }, 0)

  res.status(200).send({ balance: amount })
});

router.get('/transaction/:id', function(req, res) {
  const transaction_id = req.params.id

  if (!transaction_store.has(transaction_id)) {
    res.status(404).send('Transaction not found')
    return
  }

  console.log('hey');

  const account_id = transaction_store.get(transaction_id)

  const transactions = account_store.get(account_id)

  const amount = transactions.find(t => t.transaction_id == transaction_id).amount

  res.status(200).send({ account_id, amount })
});

router.get('/', (_, res) => {
  res.status(200).send({});
});

router.get('/max_transaction_volume', function(req, res) {

  const allAccounts = account_store.get()

  let maxVolume = 0;
  let accounts = [];

  for (let [account_id, transactions] of Object.entries(allAccounts)) {
    if (transactions.length > maxVolume) {
      maxVolume = transactions.length
      accounts = []
    }

    if (transactions.length == maxVolume) {
      accounts.push(account_id)
    }
  }

  res.status(200).send({ maxVolume, accounts })
});

module.exports = router;
