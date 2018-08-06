/**
 * Common database helper functions.
 */
let lastId = 0;
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    if (!('indexedDB' in window)) {
      console.log('IndexedDB is not supported on this browser');
      let xhr = new XMLHttpRequest();
      xhr.open('GET', `${DBHelper.DATABASE_URL}/restaurants`);
      xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
          const json = JSON.parse(xhr.responseText);
          const restaurants = json;
          callback(null, restaurants);
        } else { // Oops!. Got an error from server.
          const error = (`Request failed. Returned status of ${xhr.status}`);
          callback(error, null);
        }
      };
      xhr.send();
      return;
    }
    idb.open('restaurants', 1, function(upgradeDb){
      upgradeDb.createObjectStore('restaurants',{keyPath:'id'});
      }).then(function(db){
        var tx = db.transaction('restaurants', 'readonly');
        var dbStore = tx.objectStore('restaurants');
        dbStore.getAll().then(idbData => {
          if(idbData && idbData.length > 0) {
            // JSON data are already present in IDB
            callback(null, idbData);
          } else {
            // put JSON data in the DB
            let xhr = new XMLHttpRequest();
            xhr.open('GET', `${DBHelper.DATABASE_URL}/restaurants`);
            xhr.onload = () => {
              if (xhr.status === 200) { // Got a success response from server!
                var tx = db.transaction('restaurants', 'readwrite');
                var dbStore = tx.objectStore('restaurants');
                const json = JSON.parse(xhr.responseText);
                console.log(json);
                json.forEach(element => {
                  // Put every restaurant of the JSON in the IDB
                  dbStore.put(element);
                });
                dbStore.getAll().then(restaurants => {
                  // Get the restaurants from the IDB now
                  callback(null, restaurants);
                })
              } else { // Oops!. Got an error from server.
                const error = (`Request failed. Returned status of ${xhr.status}`);
                callback(error, null);
              }
            };
            xhr.send();
          }
        });
      });
  }

  static fetchReviews(callback) {
    if (!('indexedDB' in window)) {
      console.log('IndexedDB is not supported on this browser');
      fetch(`${DBHelper.DATABASE_URL}/reviews`).then(response => {
        const reviews = response.json();
        return reviews;
      }).then(reviews => {
        callback(null, reviews);
      }).catch(error => {
        callback(error, null);
      });
    } else {
      idb.open('reviews', 1, function(upgradeDb){
        upgradeDb.createObjectStore('reviews',{keyPath:'id'});
      }).then(function(db){
        var tx = db.transaction('reviews', 'readonly');
        var dbStore = tx.objectStore('reviews');
        dbStore.getAll().then(idbData => {
          if(idbData && idbData.length > 0) {
            // JSON data are already present in IDB
            callback(null, idbData);
          } else {
            fetch(`${DBHelper.DATABASE_URL}/reviews`).then(response => {
              return response.json();
            }).then(reviews => {
              var tx = db.transaction('reviews', 'readwrite');
              var dbStore = tx.objectStore('reviews');
              reviews.forEach(review =>{
                dbStore.put(review);
              });
              dbStore.getAll().then(reviews => {
                // Get the restaurants from the IDB now
                callback(null, reviews);
              });
            }).catch(error => {
              callback(error, null);
            });
          }
        });
      });
    }
  }

  static sendDeferredReviews() {
    console.log('sending deferred reviews');
    if (('indexedDB' in window)) {
      idb.open('deferredReviews', 1, function(upgradeDb){
        upgradeDb.createObjectStore('deferredReviews',{keyPath:'id'});
      }).then(function(db){
        var tx = db.transaction('deferredReviews', 'readwrite');
        var dbStore = tx.objectStore('deferredReviews');
        dbStore.getAll().then(idbData => {
          if (idbData && idbData.length > 0) {
            idbData.forEach(deferredReview => {
              let name = deferredReview.name;
              let rating = deferredReview.rating;
              let comments = deferredReview.comments;
              let restaurant_id = deferredReview.restaurant_id;
              let data = new FormData();
              data.append('name', name);
              data.append('rating', rating);
              data.append('comments', comments);
              data.append('restaurant_id', restaurant_id);
              fetch(`${DBHelper.DATABASE_URL}/reviews`, {method: 'POST', body: data}).then(response => {
                return response.json();
              }).then(review => {
                if (('indexedDB' in window)) {
                  idb.open('reviews', 1, function(upgradeDb_1){
                    upgradeDb_1.createObjectStore('reviews',{keyPath:'id'});
                  }).then(function(db_1){
                    var tx_1 = db_1.transaction('reviews', 'readwrite');
                    var dbStore_1 = tx_1.objectStore('reviews');
                    dbStore_1.put(review);
                  });
                }
              }).catch(error => {
                console.log(error);
                return;
              });
            });
          }
        });
        dbStore.clear();
      });
    }
  }

  static saveReview(event, callback) {
    event.preventDefault();
    let name = document.getElementById('name').value;
    let rating = document.getElementById('rating').value;
    let comments = document.getElementById('comments').value;
    let restaurant_id = document.getElementById('restaurant_id').value;
    let data = new FormData();
    data.append('name', name);
    data.append('rating', rating);
    data.append('comments', comments);
    data.append('restaurant_id', restaurant_id);
    let updatedAt = new Date();
    fetch(`${DBHelper.DATABASE_URL}/reviews`, {method: 'POST', body: data}).then(response => {
      return response.json();
    }).then(review => {
      if (('indexedDB' in window)) {
        idb.open('reviews', 1, function(upgradeDb){
          upgradeDb.createObjectStore('reviews',{keyPath:'id'});
        }).then(function(db){
          var tx = db.transaction('reviews', 'readwrite');
          var dbStore = tx.objectStore('reviews');
          dbStore.put(review);
          callback(null, review);
        });
      }
    }).catch(() => {
      const deferredReview = {
        id: lastId + 1,
        restaurant_id: restaurant_id,
        name: name,
        rating: rating,
        comments: comments,
        updatedAt: updatedAt,
        createdAt: updatedAt
      }
      lastId = deferredReview.id;
      console.log('offline DB store');
      if (('indexedDB' in window)) {
        idb.open('deferredReviews', 1, function(upgradeDb){
          upgradeDb.createObjectStore('deferredReviews',{keyPath:'id'});
        }).then(function(db){
          var tx = db.transaction('deferredReviews', 'readwrite');
          var dbStore = tx.objectStore('deferredReviews');
          dbStore.put(deferredReview);
          callback(null, deferredReview);
        });
      } else {
        callback('Your browser does not support this cool feature :(', null)
      }
    });
  }
  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }
  static fetchReviewsByRestaurantId(id, callback) {
    // fetch all reviews with proper error handling.
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        const revs = reviews.filter(r => r.restaurant_id == id);
        if (revs) { // Got the reviews
          callback(null, revs);
        } else { // Restaurant does not have reviews yet
          callback('Restaurant does not have reviews yet', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
