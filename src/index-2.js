import Caver from 'caver-js';
import {Spinner} from 'spin.js';

const cav = new Caver(klaytn);
const agContract = new cav.klay.Contract(DEPLOYED_ABI, DEPLOYED_ADDRESS);

let account;
let blockCnt = false;
let blockNumber = 0;

klaytn.on('accountsChanged', function(accounts) {
  if (accounts.length === 0) {
    // MetaMask is locked or the user has not connected any accounts
    console.log('Please connect to MetaMask.');
  } else if (accounts[0] !== account) {
    console.log(accounts);
    account = accounts[0];
    // Do any other work!
  }
})

const App = {
  start: async function () {
    
    if (sessionStorage.getItem('login') === 'true')
    {
      this.handleLogin()
    }
  },

  check_status: async function(account) {
    blockNumber = await cav.klay.getBlockNumber();
    document.getElementById("blockNubmer").innerHTML = "현재 블록: #" + blockNumber;
    this.cntBlockNumber();

    const kip17 = cav.kct.kip17('0x5bcdf0efc9c0ce98c69d9407b822b1970e710b68');
    kip17.name().then(console.log);
    // const message = 'Message to sign';
    // const signedMessage = await caver.klay.sign(message, klaytn.selectedAddress)
    // console.log(signedMessage);
  },

  cntBlockNumber: function() {
    if(!blockCnt) {
        setInterval(function(){
            blockNumber+=1;
            document.getElementById("blockNubmer").innerHTML = "현재 블록: #" + blockNumber;
        }, 1000);
        blockCnt = true;
    }
  },

  handleLogin: async function () {
    try {
      const accounts = await klaytn.enable();
      
      if (klaytn.networkVersion === 8217) {
        console.log("메인넷");
      } else if (klaytn.networkVersion === 1001) {
        console.log("테스트넷");
      } else {
        alert("ERROR: 클레이튼 네트워크로 연결되지 않았습니다!");
        return;
      }

      if (!accounts) {
        alert("KaiKas 확장 프로그램을 활성화 해주세요!");
        return;
      }
      account = accounts[0];
      App.check_status(klaytn.selectedAddress);
      this.changeUI(klaytn.selectedAddress);
      sessionStorage.setItem('login', true);
    } catch (error) {
      return;
    }
  },

  handleLogout: async function () {
    sessionStorage.setItem('login', false);
    location.reload();
  },

  generateNumbers: async function () {
    var num1 = Math.floor(Math.random() * 50 + 10);
    var num2 = Math.floor(Math.random() * 50 + 10);
    sessionStorage.setItem('result', num1 + num2);

    $('#start').hide();
    $('#num1').text(num1);
    $('#num2').text(num2);
    $('#question').show();
    document.querySelector('#answer').focus();

    this.showTimer();
  },

  submitAnswer: async function () {
    const result = sessionStorage.getItem('result');
    var answer = $('#answer').val();
    if (answer === result){
      if(confirm("대단하네요 ^^ 0.1 KLAY 받기")){
        if(await this.callContractBalance() >= 0.1){
          this.receiveKlay();
        }
        else{
          alert("죄송합니다. 컨트랙의 KLAY가 다 소모되었습니다.")
        }
      }
    }
    else{
      alert("땡! 초등학생도 하는데 ㅠㅠ");
    }
  },

  deposit: async function () {
    var spinner = this.showSpinner();
    if (await this.callOwner() !== klaytn.selectedAddress) return;
    else {
      var amount = $('#amount').val();
      if (amount) {
        agContract.methods.deposit().send({
          from: klaytn.selectedAddress,
          gas: '250000',
          value: cav.utils.toPeb(amount, "KLAY")
        })
        .once('transactionHash', (txHash) =>{
          console.log(`txHash: ${txHash}`);
        })
        .once('receipt', receipt => {
          console.log(`(#${receipt.blockNumber})`, receipt);
          spinner.stop();
          alert(amount + " KLAY를 컨트렉에 송금했습니다.");
          location.reload();
        })
        .once('error', error => {
          alert(error.message);
        })
      }
      return;
    }
  },

  callOwner: async function () {
    return await agContract.methods.owner().call().then(address => address.toLowerCase());
  },

  callContractBalance: async function () {
    return await agContract.methods.getBalance().call();
  },

  getWallet: function () {
    if (cav.klay.accounts.wallet.length){
      return cav.klay.accounts.wallet[0];
    }
  },

  changeUI: async function (address) {
    $('#loginModal').modal('hide');
    $('#login').hide();
    $('#logout').show();
    $('#game').show();
    $('#address').append('<br>' + '<p>' + '내 계정 주소: ' + address + '</p>');
    $('#contractBalance').append('<p>' + '이벤트 잔액: ' + cav.utils.fromPeb(await this.callContractBalance(), "KLAY") + ' KLAY' + '</p>');
    cav.klay.getBalance(address)
          .then(function (balance) {
              document.getElementById("myWallet").innerHTML = `지갑주소: ${address}`
              document.getElementById("myKlay").innerHTML = `잔액: ${caver.utils.fromPeb(balance, "KLAY")} KLAY`
          });
    if (await this.callOwner() === address){
      $('#owner').show();
    }
  },

  showTimer: function () {
    var seconds = 5;
    $('#timer').text(seconds);
    
    var interval = setInterval(() => {
      $('#timer').text(--seconds);
      if(seconds <= 0) {
        $('#timer').text('');
        $('#answer').val('');
        $('#question').hide();
        $('#start').show();
        clearInterval(interval)
      }
    }, 1000);
  },

  showSpinner: function () {
    var target = document.getElementById("spin");
    return new Spinner(opts).spin(target);
  },

  receiveKlay: async function () {
    var spinner = this.showSpinner();
    agContract.methods.transfer(cav.utils.toPeb("0.1", "KLAY")).send({
      from: klaytn.selectedAddress,
      gas: '250000'
    })
    .then(function (receipt) {
      if (receipt.status){
        spinner.stop();
        alert("0.1 KLAY가 " + klaytn.selectedAddress + " 계정으로 지급되었습니다.");
        $('#transaction').html("");
        $('#transaction').append(`<p><a href='https://baobab.scope.klaytn.com/tx/${receipt.transactionHash}' target='_blank'>클레이튼 Scope에서 트렌젝션 확인</a></p>`);
        return agContract.methods.getBalance().call()
          .then((balance) => {
            $('#contractBalance').html("");
            $('#contractBalance').append('<p>' + '이벤트 잔액: ' + cav.utils.fromPeb(balance, "KLAY") + ' KLAY' + '</p>');
          })
      }
    })
  }
};

window.App = App;

window.addEventListener("load", function () {
  App.start();
});

var opts = {
  lines: 10, // The number of lines to draw
  length: 30, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  color: '#5bc0de', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  position: 'absolute' // Element positioning
};