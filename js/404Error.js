// Get the tokens and username from the local storage to check if the user is signed in
function checkAuthState() {
    var accessToken = localStorage.getItem("accessToken");
    var idToken = localStorage.getItem("idToken");
    var refreshToken = localStorage.getItem("refreshToken");
    var username = localStorage.getItem("username");

    // If the user is signed in, do nothing
    if (accessToken && idToken && refreshToken && username) {
        return;
    } else {
        // If the user is not signed in, redirect to the authentication page
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
