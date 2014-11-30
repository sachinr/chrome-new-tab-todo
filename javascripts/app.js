app = {};

app.init = function(){

  var token = localStorage.token;
  $('.raw-list').val(localStorage.wipTask);
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
        app.tasks     = app.datastore.getTable('tasks');
        app.lists     = app.datastore.getTable('lists');

        app.loadLists();
      });
    });

  } else {
    console.log('You need to set a Dropbox application token');
  }

},

app.loadLists = function(){
  if (app.lists.query().length === 0){
    app.lists.insert({
      title: 'First list',
      created: new Date()
    });
  }

  $.each(app.lists.query(), function(i, q) {
    $('.lists-container').append(["<li>", q.get("title") ,"</li>"].join(' '));
  });

  app.loadFirstList();
  app.loadBookmarks();
},

app.loadFirstList = function(){
  var firstList = app.lists.query()[0];
  app.currentList = firstList._rid;
  app.loadTasks();
},

app.loadTasks = function(){
  $('.rendered-list').html('');
  var listTasks = app.tasks.query({listId: app.currentList});
  if (listTasks.length === 0){
    app.tasks.insert({
      listId: app.currentList,
      content: "first task",
      rawContent: "first task",
      completed: false,
      created: new Date()
    });
  }

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
        console.log(b);
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

  $(document).on('click', '.list-container .save-list', function(e) {
    e.preventDefault();
    localStorage.wipTask = ""
    var taskId = $('.list-container .raw-list').data('edit-id');
    var rawContent = $('.list-container .raw-list').val();
    app.getMarkdown(rawContent, function(renderedContent){
      if (taskId) {
        app.tasks.get(taskId).set("content", renderedContent);
        app.tasks.get(taskId).set("rawContent", rawContent);
        $('.list-container .raw-list').data('edit-id', null);
        $('.list-container .raw-list').val('');
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
    $('.list-container .raw-list').val(task.get('rawContent'));
    $('.list-container .raw-list').data('edit-id', task.getId());
  });

  $(document).on('keyup', '.raw-list', function(e){
    localStorage["wipTask"] = $(this).val();
  });

});
