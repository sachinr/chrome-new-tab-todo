function save_options() {
  var select = document.getElementById("token");
  var btype = select.value;
  localStorage["token"] = btype;

  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 750);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  var favorite = localStorage["token"];
  if (!favorite) {
    return;
  }
  var select = document.getElementById("token");
  select.value = favorite;
}
document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);
