// Check if access token is expired 
function tokenExpired(token) {
    try {
        // Decode the access token
        var decodedAccessToken = jwt_decode(token);
        // Check if the expiration time of the access token is less than the current time 
        return decodedAccessToken.exp * 1000 < Date.now();
    } catch (error) {
        // If there is an error, return true to force the user to sign in again regardless 
        return true;
    }
}


// Get the tokens and username from the local storage to check if the user is signed in
function checkAuthState() {
    // Get the access token from the local storage
    var accessToken = localStorage.getItem("accessToken");
    // Check if the access token is expired
    var accessTokenExpired = tokenExpired(accessToken);

    if (accessToken && !accessTokenExpired) {
        // If all tokens and the username are present, the user is signed in
        return;
    } else {
        // If any of the tokens or the username is missing, redirect to the authentication page
        location.href = "authenticationPage.html";
    }
}


// Log out the user from the website
function logOut() {
    // Get the access token from the local storage
    var accessToken = localStorage.getItem("accessToken");

    fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/authentication", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        // Send the action to be done and the access token to the API
        body: JSON.stringify({
            action: "logOut",
            accessToken: accessToken
        })
    })
        .then(response => {
            if (!response.ok) {
                // If response status is not status 200, display the error message and do not proceed
                return response.json().then(error => {
                    alert(`Error: ${JSON.stringify(error)}`);
                    return null;
                });
            } else {
                // Parse the JSON from the response
                return response.json();
            }
        })
        .then(data => {
            // After successful log out, clear the local storage to get rid of precious tokens and display a message
            localStorage.clear();
            alert("Logged out successfully!");
            // Redirect to the authentication page
            location.href = "authenticationPage.html";
        })
        .catch(error => {
            alert("Log out failed.");
            alert("Error\n", error);
        });
}

