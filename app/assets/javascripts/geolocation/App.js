var mapkeep = mapkeep || {};

/**
 * Constructor for mapkeep application
 * @param auth
 * @constructor
 */
mapkeep.App = function(auth) {
  /** Last open info window */
  this.curWindow = null;
  /** Last clicked marker */
  this.curMarker = null;
  /** The google map object */
  this.map = null;
  /** The user's current location */
  this.userLoc = null;
  /** Fully populated notes by id */
  this.notes = {};
  /** All markers **/
  this.markers = {};

  /** @type mapkeep.FormManager */
  this.formManager = new mapkeep.FormManager(this, auth);
  this.albumManager = new mapkeep.AlbumManager(this.formManager, auth);
};

/**
 * Alert user something went wrong
 */
mapkeep.App.prototype.tryAgain = function() {
  alert('Oops! Something went wrong. ' +
    'Please reload the page and try again.');
};

/**
 * Initializes map at input coordinates with user's notes
 * Initializes form helper
 * @param user
 * @param notes
 * @param albums
 */
mapkeep.App.prototype.init = function(user, notes, albums) {

  if (user.location.lat && user.location.lng) {
    this.userLoc = new google.maps.LatLng(user.location.lat, user.location.lng);
  }

  this.formManager.init(albums);
  this.albumManager.init(albums);
  this.initMap();
  this.setUpClicks();
  this.user = user;
  // initially just user's notes
  this.drawNotes(notes);

  google.maps.event.addListener(this.map, 'idle',
    this.refreshNotes.bind(this));

  this.map.controls[google.maps.ControlPosition.TOP_RIGHT]
    .push($('#overlay').get(0));
  this.map.controls[google.maps.ControlPosition.TOP_LEFT]
    .push($('#album-overlay').get(0));
};

/**
 * Draws list of notes on maps, clearing old ones
 * @param notes
 */
mapkeep.App.prototype.drawNotes = function(notes) {
  this.notes = {}; // TODO: only delete when necessary

  // Draw user and public notes on map
  var ids = {};
  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    if (!this.markers[note.id]) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(note.latitude, note.longitude),
        map: this.map,
        draggable: false
      });

      this.markers[note.id] = marker;
      if (note.user_id != this.user.id) {
        marker.setIcon('http://www.googlemapsmarkers.com/v1/7777e1/');
      }

      this.addMarkerListener(marker, note.id);
    }
    ids[note.id] = true;
  }

  // Delete markers we no longer are showing
  for (var prop in this.markers) {
    if (this.markers.hasOwnProperty(prop) && !ids[prop]) {
      this.markers[prop].setMap(null);
      delete this.markers[prop];
    }
  }
};

/**
 * Initializes map and user coordinates || UCLA
 */
mapkeep.App.prototype.initMap = function() {
  var center = this.userLoc ?
    new google.maps.LatLng(this.userLoc.lat(), this.userLoc.lng()) :
    new google.maps.LatLng(34.0722, -118.4441);

  var mapOptions = {
    center: center,
    mapTypeControl: false,
    minZoom: 4,
    streetViewControl: false,
    zoom: 10
  };

  this.map = new google.maps.Map(
    document.getElementById('map-canvas'), mapOptions);
};

/**
 * Refresh notes based on map bounds
 */
mapkeep.App.prototype.refreshNotes = function() {
  var self = this;
  var bounds = this.map.getBounds();
  var ne = bounds.getNorthEast();
  var sw = bounds.getSouthWest();
  $.ajax({
    url: '/index/update_notes/' + ne.lat() + '/' + ne.lng() +
    '/' + sw.lat() + '/' + sw.lng(),
    type: 'GET',
    success: function(data) {
      self.drawNotes(data);
    },
    error: function() {
      self.tryAgain();
    }
  });
};

/**
 * Create note and close overlay click listeners
 */
mapkeep.App.prototype.setUpClicks = function() {
  // Drop pin button
  $('#create_note').click(this.dropPin.bind(this));

  // Open an album form
  $('#create_album').click(this.createAlbum.bind(this));

  // Close button on note overlay
  $('#close-overlay').click(function() {
    // Reset and remove form
    var overlay = $('#overlay');
    overlay.addClass('hide');

    // Close info window and make marker un-draggable
    this.curWindow.setMap(null);
    this.curMarker.setOptions({
      draggable: false
    });

    // If new note not saved, clear marker
    if (overlay.find('form').hasClass('new_note')) {
      this.curMarker.setMap(null);
    }
  }.bind(this));

  // Close button on note album overlay
  $('#album-close-overlay').click(function() {
    // Reset and remove form
    var overlay = $('#album-overlay');
    overlay.addClass('hide');
  }.bind(this));
};

/**
 * Drops pin in center of map with editable form unless they already
 * have a new note to edit
 */
mapkeep.App.prototype.dropPin = function() {

  // Prevent pin drop if currently editing a note
  if (this.formManager.isEditable()) {
    this.bounceMarker(350);
    return;
  }

  // Create and drop pin onto map
  this.curMarker = new google.maps.Marker({
    position: this.map.center,
    map: this.map,
    draggable: true,
    animation: google.maps.Animation.DROP
  });

  this.formManager.showForm(null, 450);
};

mapkeep.App.prototype.createAlbum = function() {
  // Show album in overlay with a new form
  var num = this.albumManager.createAlbumView();
  this.albumManager.showForm(num);
};

/**
 * Opens info window with specified title at the marker
 * @param title
 * @param marker
 */
mapkeep.App.prototype.openInfoWindow = function(title, marker) {
  var infoWindow = new google.maps.InfoWindow({
    content: title
  });

  if (this.curWindow) {
    this.curWindow.setMap(null);
  }

  this.curWindow = infoWindow;
  infoWindow.open(this.map, marker);
};

/**
 * Adds a listener to a marker to open a certain form
 * @param marker
 * @param noteId
 */
mapkeep.App.prototype.addMarkerListener = function(marker, noteId) {
  google.maps.event.addListener(marker, 'click', function() {

    // Prevent marker click if user currently editing a note
    if (this.formManager.isEditable()) {
      this.bounceMarker(350);
      return;
    }

    // Turn off dragging on last marker
    if (this.curMarker) {
      this.curMarker.setOptions({
        draggable: false
      });
    }

    this.curMarker = marker;
    this.map.panTo(this.curMarker.getPosition());

    if (this.notes[noteId]) {
      this.formManager.showForm(this.notes[noteId], 0);
    } else {
      var self = this;
      $.ajax({
        url: '/notes/' + noteId + '.json',
        type: 'GET',
        dataType: 'json',
        success: function(data) {
          self.notes[noteId] = data;
          self.formManager.showForm(self.notes[noteId], 0);
        },
        error: function() {
          self.tryAgain();
        }
      });
    }
  }.bind(this));
};

/**
 * Bounce marker for certain time
 * @param time
 */
mapkeep.App.prototype.bounceMarker = function(time) {
  this.curMarker.setAnimation(google.maps.Animation.BOUNCE);
  setTimeout(function() {
    this.curMarker.setAnimation(null);
  }.bind(this), time);
};

/**
 * Callback for note creation
 * @param note
 */
mapkeep.App.prototype.noteCreated = function(note) {
  this.notes[note.id] = note;
  this.markers[note.id] = this.curMarker;
  this.addMarkerListener(this.curMarker, note.id);
  this.formManager.updateFormAction(note);
  this.formManager.formSubmitted(note);
};

/**
 * Callback for note updates
 * @param note
 */
mapkeep.App.prototype.noteUpdated = function(note) {
  this.formManager.formSubmitted(note);
};

/**
 * Callback for note deletion
 */
mapkeep.App.prototype.noteDeleted = function() {
  this.curWindow.close();
  this.curMarker.setMap(null);
  $('#overlay').addClass('hide');
};


mapkeep.App.prototype.albumCreated = function(album) {
  this.albumManager.addAlbum(album);
};