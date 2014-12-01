app = {};

app.init = function(){

  var token = localStorage.token;
  $('.raw-task').val(localStorage.wipTask);
  if (token) {
    var client = new Dropbox.Client({key: '9i6d95bexmx3log', token: token});

    // Try to finish OAuth authorization.
    client.authenticate({interactive: false}, function (error) {
      if (error) {
        alert('Authentication error: ' + error);
      }

      var datastoreManager = client.getDatastoreManager();
      datastoreManager.openDefaultDatastore(function (error, datastore) {
        if (error) {
          alert('Error opening default datastore: ' + error);
        }

        app.datastore = datastore;
        app.tasks       = app.datastore.getTable('tasks');

        app.loadLists();
        app.loadBookmarks();
      });
    });

  } else {
    alert('You need to set a Dropbox application token');
  }

},

app.loadLists = function(){
  $('.lists-container').html('');

  app.lists = app.datastore.getTable('lists');
  if (app.lists.query().length === 0){
    app.lists.insert({
      title: 'First list',
      created: new Date()
    });
  }

  $.each(app.lists.query(), function(i, q) {
    listTemplate = $('script[type="template/list"]').attr('template');
    listTemplate = listTemplate.replace('{{title}}', q.get("title"));
    listTemplate = listTemplate.replace(/\{\{\s?q\._rid\s?\}\}/g, q._rid);
    $('.lists-container').append(listTemplate);
  });

  app.loadTasks();
},

app.loadTasks = function(){
  app.currentList = app.currentList || localStorage["currentList"] || app.lists.query()[0]._rid;
  localStorage["currentList"] = app.currentList;
  $(".list-title .active").removeClass('active');
  $(".list-title [data-list-id='" + app.currentList + "']").addClass('active')

  $('.rendered-list').html('');
  var listTasks = app.tasks.query({listId: app.currentList});

  $.each(listTasks, function(i, q) {
    taskTemplate = $('script[type="template/task"]').attr('template');
    taskTemplate = taskTemplate.replace('{{content}}', q.get("content"));
    taskTemplate = taskTemplate.replace(/\{\{\s?q\._rid\s?\}\}/g, q._rid);

    $('.rendered-list').append(taskTemplate);
  });
},

app.loadBookmarks = function(){
  chrome.bookmarks.getSubTree("1", function(data){
    var children = data[0].children;
    $.each(children, function(i, b){
      if(b.children === undefined){
        $('.bookmarks-container').append(["<li><a href='", b.url ,"'>", b.title,"</a></li>"].join(''));
      }
    });
  });
},

app.getMarkdown = function(raw, callback){
  $.ajax({
    url: "https://api.github.com/markdown",
    method: "POST",
    data: JSON.stringify({text: raw, mode:"gfm"}),
    success: function(data) {
      callback(data);
    }
  })

},

$(function(){
  app.init();

  $(document).on('click', '.new-list', function(e) {
    $(this).hide();
    $('.lists-actions').show();
    $('.new-list-title').focus();
  });

  $(document).on('click', '.create-list', function(e) {
    e.preventDefault();
    record = app.lists.insert({
      title: $('.new-list-title').val(),
      created: new Date()
    });

    app.currentList = record._rid;

    $('.new-list-title').val('');
    app.loadLists();

    $('.new-list').show();
    $('.lists-actions').hide();
  });

  $(document).on('click', '.delete-list', function(e) {
    e.preventDefault();
    if(confirm("Are you sure?")){
      app.lists.get($(e.target).data('list-id')).deleteRecord();
      app.currentList = null;
      app.loadLists();
    }
  });

  $(document).on('click', '.load-list', function(e) {
    e.preventDefault();
    app.currentList = $(e.target).data('list-id')
    app.loadTasks();
  });

  $(document).on('click', '.list-container .save-task', function(e) {
    e.preventDefault();
    localStorage.wipTask = ""
    var taskId = $('.list-container .raw-task').data('edit-id');
    var rawContent = $('.list-container .raw-task').val();
    app.getMarkdown(rawContent, function(renderedContent){
      if (taskId) {
        app.tasks.get(taskId).set("content", renderedContent);
        app.tasks.get(taskId).set("rawContent", rawContent);
        $('.list-container .raw-task').data('edit-id', null);
        $('.list-container .raw-task').val('');
      } else {
        app.tasks.insert({
          listId: app.currentList,
          content: renderedContent,
          rawContent: rawContent,
          completed: false,
          created: new Date()
        });
      }

      app.loadTasks();
      $('.raw-task').val('');
    });
  });

  $(document).on('click', '.delete-task', function(e) {
    e.preventDefault();
    app.tasks.get($(e.target).data('task-id')).deleteRecord();
    app.loadTasks();
  });

  $(document).on('click', '.edit-task', function(e) {
    e.preventDefault();
    task = app.tasks.get($(e.target).data('task-id'));
    $('.list-container .raw-task').val(task.get('rawContent'));
    $('.list-container .raw-task').data('edit-id', task.getId());
  });

  $(document).on('keyup', '.raw-task', function(e){
    localStorage["wipTask"] = $(this).val();
  });

});
