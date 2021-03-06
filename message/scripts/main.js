var arg = new Object;
var url = location.search.substring(1).split('&');
for(var i=0;url[i];i++){
    var k = url[i].split("=");
    arg[k[0]] = k[1];
}
var eventID = arg.event_id;        
        
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
infoWindow.setPosition(pos);
infoWindow.setContent(browserHasGeolocation ?
'Error: The Geolocation service failed.' :
'Error: Your browser doesn\'t support geolocation.')};

// Initializes FriendlyChat.
function FriendlyChat() {
  this.checkSetup();

  // Shortcuts to DOM Elements.
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');
  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  // Saves message on form submit.
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

  // Toggle for the button.
  var buttonTogglingHandler = this.toggleButton.bind(this);
  this.messageInput.addEventListener('keyup', buttonTogglingHandler);
  this.messageInput.addEventListener('change', buttonTogglingHandler);

  // Events for image upload.
  this.submitImageButton.addEventListener('click', function(e) {
    e.preventDefault();
    this.mediaCapture.click();
  }.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));

  this.initFirebase();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
FriendlyChat.prototype.initFirebase = function() {
  // TODO(DEVELOPER): Initialize Firebase.
    // Shortcuts to Firebase SDK features.
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();
  // Initiates Firebase auth and listen to auth state changes.
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Loads chat messages history and listens for upcoming ones.
FriendlyChat.prototype.loadMessages = function() {
  // TODO(DEVELOPER): Load and listens for new messages.
    // Reference to the /messages/ database path.
  this.messagesRef = this.database.ref('messages/'+eventID);
  // Make sure we remove all previous listeners.
  this.messagesRef.off();

  // Loads the last 12 messages and listen for new ones.
  var setMessage = function(data) {
    var val = data.val();
    this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
  }.bind(this);
  this.messagesRef.limitToLast(12).on('child_added', setMessage);
  this.messagesRef.limitToLast(12).on('child_changed', setMessage);
};

// Saves a new message on the Firebase DB.
FriendlyChat.prototype.saveMessage = function(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (this.messageInput.value && this.checkSignedInWithMessage()) {

    // TODO(DEVELOPER): push new message to Firebase.
      // Return true if the user is signed in Firebase

   var currentUser = this.auth.currentUser;
    // Add a new message entry to the Firebase Database.
    this.messagesRef.push({
      name: currentUser.displayName+" "+currentTime(),
      text: this.messageInput.value,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function() {
      // Clear message text field and SEND button state.
      FriendlyChat.resetMaterialTextfield(this.messageInput);
      this.toggleButton();
    }.bind(this)).catch(function(error) {
      console.error('Error writing new message to Firebase Database', error);
    });
    /*  
        if (this.auth.currentUser) {
    return true;
  }*/
  }
};

// Sets the URL of the given img element with the URL of the image stored in Cloud Storage.
FriendlyChat.prototype.setImageUrl = function(imageUri, imgElement) {
  imgElement.src = imageUri;

  // TODO(DEVELOPER): If image is on Cloud Storage, fetch image URL and set img element's src.
     // If the image is a Cloud Storage URI we fetch the URL.
  if (imageUri.startsWith('gs://')) {
    imgElement.src = FriendlyChat.LOADING_IMAGE_URL; // Display a loading image first.
    this.storage.refFromURL(imageUri).getMetadata().then(function(metadata) {
      imgElement.src = metadata.downloadURLs[0];
    });
  } else {
    imgElement.src = imageUri;
  }
};

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
FriendlyChat.prototype.saveImageMessage = function(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  this.imageForm.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (this.checkSignedInWithMessage()) {

    // TODO(DEVELOPER): Upload image to Firebase storage and add message.
     
    // We add a message with a loading icon that will get updated with the shared image.
    var currentUser = this.auth.currentUser;
    this.messagesRef.push({
      name: currentUser.displayName,
      imageUrl: FriendlyChat.LOADING_IMAGE_URL,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function(data) {

      // Upload the image to Cloud Storage.
      var filePath = currentUser.uid + '/' + data.key + '/' + file.name;
      return this.storage.ref(filePath).put(file).then(function(snapshot) {

        // Get the file's Storage URI and update the chat message placeholder.
        var fullPath = snapshot.metadata.fullPath;
        return data.update({imageUrl: this.storage.ref(fullPath).toString()});
      }.bind(this));
    }.bind(this)).catch(function(error) {
      console.error('There was an error uploading a file to Cloud Storage:', error);
    });
  }
};

// Signs-in Friendly Chat.
FriendlyChat.prototype.signIn = function() {
  // TODO(DEVELOPER): Sign in Firebase with credential from the Google user.
    // Sign in Firebase using popup auth and Google as the identity provider.
  var provider = new firebase.auth.FacebookAuthProvider();
  this.auth.signInWithPopup(provider);
};

// Signs-out of Friendly Chat.
FriendlyChat.prototype.signOut = function() {
  // TODO(DEVELOPER): Sign out of Firebase.
    // Sign out of Firebase.
  this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
FriendlyChat.prototype.onAuthStateChanged = function(user) {
  if (user) { // User is signed in!
    // Get profile pic and user's name from the Firebase user object.
    var profilePicUrl = user.PhotoURL;   // TODO(DEVELOPER): Get profile pic.
    var userName = user.displayName;        // TODO(DEVELOPER): Get user's name.

    // Set the user's profile pic and name.
    this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
    this.userName.textContent = userName;

    // Show user's profile and sign-out button.
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    // Hide sign-in button.
    this.signInButton.setAttribute('hidden', 'true');

    // We load currently existing chant messages.
    this.loadMessages();

    // We save the Firebase Messaging Device token and enable notifications.
    this.saveMessagingDeviceToken();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    // Show sign-in button.
    this.signInButton.removeAttribute('hidden');
  }
};

// Returns true if user is signed-in. Otherwise false and displays a message.
FriendlyChat.prototype.checkSignedInWithMessage = function() {
  /* TODO(DEVELOPER): Check if user is signed-in Firebase. */
  if (this.auth.currentUser) {
    return true;
  }
  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
  return false;
};

// Saves the messaging device token to the datastore.
FriendlyChat.prototype.saveMessagingDeviceToken = function() {
  // TODO(DEVELOPER): Save the device token in the realtime datastore
};

// Requests permissions to show notifications.
FriendlyChat.prototype.requestNotificationsPermissions = function() {
  // TODO(DEVELOPER): Request permissions to send notifications.
};

// Resets the given MaterialTextField.
FriendlyChat.resetMaterialTextfield = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Template for messages.
FriendlyChat.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';

// A loading image URL.
FriendlyChat.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Displays a Message in the UI.
FriendlyChat.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = FriendlyChat.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');
  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUri) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }.bind(this));
    this.setImageUrl(imageUri, image);
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in.
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.messageList.scrollTop = this.messageList.scrollHeight;
  this.messageInput.focus();
};

// Enables or disables the submit button depending on the values of the input
// fields.
FriendlyChat.prototype.toggleButton = function() {
  if (this.messageInput.value) {
    this.submitButton.removeAttribute('disabled');
  } else {
    this.submitButton.setAttribute('disabled', 'true');
  }
};

// Checks that the Firebase SDK has been correctly setup and configured.
FriendlyChat.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
};


function currentTime(){
    var dt = new Date;
    //console.log(dt.getMonth()+1+"月"+dt.getDay()+"日"+dt.getHours()+":"+dt.getMinutes());
    var minutes = dt.getMinutes();
    if(minutes < 10){
        minutes = "0"+minutes;
    }
    return dt.getMonth()+1+"月"+dt.getDay()+"日"+dt.getHours()+":"+minutes;
}

function chatNameInput(){
    var tabtitle, chattitle;
    firebase.database().ref("events/"+eventID).once("value",function(snapshot){
        tabtitle = ""+snapshot.val().eventname+"";
        chattitle = "<i class='material-icons'>chat_bubble_outline</i>" + tabtitle;
        document.getElementById("tabName").innerHTML = tabtitle;
        document.getElementById("chatName").innerHTML = chattitle;
    });
}
function initMap(){
    $(window).load(function(){
        var myLatlng;
        firebase.database().ref("events/"+eventID).on("value",function(snapshot){
            myLatlng = new google.maps.LatLng(snapshot.child("location").val());
            var map = new google.maps.Map(document.getElementById('map'), {
                center: myLatlng,
                zoom: 13
            });
            var infowindow = new google.maps.InfoWindow({
                content: "集合場所"
            });
            var marker = new google.maps.Marker({ 
            map: map ,
            position: myLatlng, 
            }); 
            infowindow.open(map,marker);
            marker.addListener('click', function() {
                infowindow.open(map, marker);
            });
            marker.setMap(map);
        });
    });
}

$(function(){
  //ボタンをクリックしたら
 $("#modal-button").click(function(){
      //body内の最後に<div id="modal-bg"></div>を挿入
     $("body").append('<div id="modal-bg"></div>');

    //画面中央を計算する関数を実行
    modalResize();

    // $('#modal-container').css('display','block');
    //モーダルウィンドウを表示
     $("#modal-bg,#modal-container").fadeIn("slow");

    //画面のどこかをクリックしたらモーダルを閉じる
      $("#modal-bg, #close").click(function(){
          $("#modal-container,#modal-bg").fadeOut("slow",function(){
         //挿入した<div id="modal-bg"></div>を削除
              $('#modal-bg').remove() ;
         });

        });
     
     console.log("line");
     $("#"+userID).click(function(){
         console.log(userID);
         location.href = "mypage.html?user_id="+userID;
     });

    //画面の左上からmodal-mainの横幅・高さを引き、その値を2で割ると画面中央の位置が計算できます
     $(window).resize(modalResize);
      function modalResize(){

            var w = $(window).width();
          var h = $(window).height();

            var cw = $("#modal-container").outerWidth();
           var ch = $("#modal-container").outerHeight();

        //取得した値をcssに追加する
            $("#modal-container").css({
                "left": ((w - cw)/2) + "px",
                "top": ((h - ch)/2) + "px"
          });
     }
   });
});

function memberList(eventID){
    firebase.database().ref("events/"+eventID+"/members").on("value",function(snapshot){
        snapshot.forEach(function(childSnapshot){
            userID = childSnapshot.key;
            var userName = childSnapshot.val();
            var listHTML = '<div id="'+userID+' class="memberlist">'+userName+'</div>';
            $("#modal-main").append(listHTML);
        })
    });
}

window.onload = function() {
    chatNameInput();
    window.friendlyChat = new FriendlyChat();
    memberList(eventID);
};