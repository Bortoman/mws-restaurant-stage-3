let restaurant;
let reviews;
var map;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      fillBreadcrumb();
      src1='https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=12&size=600x300&maptype=roadmap'
      keySig='&key=AIzaSyCaMDihxIfFPAoDX5tKJzF3w31-jqzVmog';
      markerString = `&markers=color:red%7Clabel:S%7C${restaurant.latlng.lat},${restaurant.latlng.lng}`;
      let staticMap = document.getElementById('staticMap');
      staticMap.src = src1 + markerString + keySig;
    }
  });
});
/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      fillBreadcrumb();
      src1='https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=12&size=600x300&maptype=roadmap'
      keySig='&key=AIzaSyCaMDihxIfFPAoDX5tKJzF3w31-jqzVmog';
      markerString = `&markers=color:red%7Clabel:S%7C${restaurant.latlng.lat},${restaurant.latlng.lng}`;
      let staticMap = document.getElementById('staticMap');
      staticMap.src = src1 + markerString + keySig;
    }
  });
}

window.addEventListener('online', () => {
  DBHelper.sendDeferredReviews();
});

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name + " Restaurant";

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.fetchReviewsByRestaurantId(restaurant.id, (error, reviews) => {
    self.reviews = reviews;
    if (!reviews) {
      console.error(error);
      return;
    }
    fillReviewsHTML();
  });
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
  console.log(reviews);
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
  const h3 = document.createElement('h3');
  h3.innerHTML = 'Insert your review:';
  container.appendChild(h3);
  const form = document.createElement('form');
  form.method = 'POST';
  form.addEventListener('submit', event => {
    DBHelper.saveReview(event, (error, review) => {
      if (review) {
        reviews.push(review);
        console.log(reviews);
        resetReviews(reviews);
        fillReviewsHTML();
      } else {
        console.error(error);
        return;
      }
    });
  });
  form.action = `${DBHelper.DATABASE_URL}/reviews/`;
  form.id = 'add_review_form';
  const inputRestaurantId = document.createElement('input');
  inputRestaurantId.type = 'hidden';
  inputRestaurantId.name = 'restaurant_id';
  inputRestaurantId.id = 'restaurant_id';
  inputRestaurantId.value = self.restaurant.id;
  const labelName = document.createElement('label');
  labelName.for = 'name';
  labelName.innerHTML = 'Your name:';
  const inputName = document.createElement('input');
  inputName.id = 'name'
  inputName.name = 'name';
  inputName.type = 'text';
  inputName.placeholder = 'Your name';
  inputName.required = 'true';
  const labelRating = document.createElement('label');
  labelRating.for = "rating";
  labelRating.innerHTML = "Rating:";
  const inputRating = document.createElement('input');
  inputRating.id = 'rating';
  inputRating.name= 'rating';
  inputRating.type='number';
  inputRating.placeholder = 'Rating from 1 to 5';
  inputRating.required = 'true';
  const labelComments = document.createElement('label');
  labelComments.for = 'comments';
  labelComments.innerHTML = 'Comments:';
  const comments = document.createElement('textarea');
  comments.id = 'comments';
  comments.name = 'comments';
  comments.placeholder = 'Your comments here!';
  comments.required = 'true';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.value = 'Add review';
  submit.innerHTML = "Add review";
  form.appendChild(inputRestaurantId);
  form.appendChild(labelName);
  form.appendChild(inputName);
  form.appendChild(labelRating);
  form.appendChild(inputRating);
  form.appendChild(labelComments);
  form.appendChild(comments);
  form.appendChild(submit);
  container.appendChild(form);
}

resetReviews = (reviews) => {
  // Remove all restaurants
  self.reviews = [];
  const container = document.getElementById('reviews-container');
  container.innerHTML = '';
  const ul = document.createElement('ul');
  ul.id = 'reviews-list';

  container.appendChild(ul);

  self.reviews = reviews;
}


/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  let d = new Date(review.updatedAt);
  date.innerHTML = d.toDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
