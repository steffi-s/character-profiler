/**
 * Created by steffi on 27.04.16.
 */

var db;
var dbName = "character_db";
var storeName = "character";

function dtFormat(input) {
  if (!input) return "";

  var res = (input.getMonth() + 1) + "/" + input.getDate() + "/" + input.getFullYear() + " ";
  var hour = input.getHours();
  var ampm = "AM";

  if (hour === 12) {
    ampm = "PM";
  }

  if (hour > 12) {
    hour -= 12;
    ampm = "PM";
  }

  var minute = input.getMinutes() + 1;
  if (minute < 10) {
    minute = "0" + minute;
  }

  res += hour + ":" + minute + " " + ampm;
  return res;
}

$(document).ready(function () {
  if (!("indexedDB" in window)) {
    alert("IndexedDB support required for this demo!");
    return;
  }

  var $characterDetail = $("#characterDetail");
  var $characterForm = $("#characterForm");
  var $characterList = $("#characterList");

  var openRequest = window.indexedDB.open(dbName, 1);

  openRequest.onerror = function (e) {
    console.log("Error opening db");
    console.dir(e);
  };

  openRequest.onupgradeneeded = function (e) {
    var thisDb = e.target.result;
    var objectStore;

    // Create OS
    if (!thisDb.objectStoreNames.contains(storeName)) {
      console.log("Creating OS");
      objectStore = thisDb.createObjectStore(storeName, {
        keyPath: "id",
        autoIncrement: true
      });

      objectStore.createIndex("namelc", "namelc", {unique: false});
      objectStore.createIndex("traits", "traits", {
        unique: false,
        multiEntry: true
      });
    }
  };

  openRequest.onsuccess = function (e) {
    db = e.target.result;

    db.onerror = function (event) {
      alert("Database error: " + event.target.errorCode);
    };

    displayCharacters();
    doCount();
  };

  function displayCharacters(filter) {
    var transaction = db.transaction([storeName], "readonly");
    var content = "<table class='table table-bordered table-striped'>" +
      "<thead>" +
      "<tr>" +
      "<th>Name</th>" +
      "<th>Updated</th>" +
      "<th>&nbsp;</th>" +
      "</tr>" +
      "</thead>" +
      "<tbody>";

    transaction.oncomplete = function (event) {
      $characterList.html(content);
    };

    var handleResult = function (event) {
      var cursor = event.target.result;
      if (cursor) {
        content += "<tr data-key=" + cursor.primaryKey + "><td class='characterName'>" + cursor.value.name + "</td>";
        content += "<td>" + dtFormat(cursor.value.updated) + "</td>";
        content += "<td><a class='btn btn-primary edit'>Edit</a> <a class='btn btn-danger delete'>Delete</a></td>";
        content += "</tr>";

        cursor.continue();
      } else {
        content += "</tbody></table>";
      }
    };

    var objectStore = transaction.objectStore(storeName);

    if (filter) {
      filter = filter.toLowerCase();

      var range = IDBKeyRange.bound(filter, filter + "\uffff");
      var index = objectStore.index("namelc");
      index.openCursor(range).onsuccess = handleResult;
    } else {
      objectStore.openCursor().onsuccess = handleResult;
    }
  }

  function doCount() {
    db.transaction([storeName], "readonly").objectStore(storeName).count().onsuccess = function (event) {
      $("#sizeSpan").text("(" + event.target.result + " Characters Total)");
    };
  }

  $characterList.on("click", "a.delete", function (e) {
    var thisId = $(this).parent().parent().data("key");
    var t = db.objectStore(storeName).delete(thisId);

    t.oncomplete  = function (event) {
      displayCharacters();
      doCount();

      $characterDetail.hide();
      $characterForm.hide();
    };

    return false;
  });

  $characterList.on("click", "a.edit", function (e) {
    var thisId = $(this).parent().parent().data("key");
    var request = db.transaction([storeName], "readwrite")
      .objectStore(storeName)
      .get(thisId);

    request.onsuccess = function (event) {
      var character = request.result;

      $("#key").val(character.id);
      $("#name").val(character.name);
      $("#body").val(character.body);
      $("#traits").val(character.traits.join(","));
      $characterDetail.hide();
      $characterForm.show();
    };

    return false;
  });

  $characterList.on("click", "td", function () {
    var thisId = $(this).parent().data("key");

    displayNote(thisId);
  });

  function displayNote(id) {
    var transaction = db.transaction([storeName]);
    var objectStore = transaction.objectStore(storeName);
    var request = objectStore.get(id);

    request.onsuccess = function (event) {
      var character = request.result;
      var content = "<h2>" + character.name + "</h2>";

      if (character.traits.length > 0) {
        content += "<strong>Traits:</strong> ";
        character.traits.forEach(function (elm/*, idx, arr*/) {
          content += "<a class='traitLookup' title='Click for Related Characters' data-characterid=" + character.id + ">" + elm + "</a> ";
        });

        content += "<br/><div id='relatedCharactersDisplay'></div>";
      }

      content += "<p>" + character.body + "</p>";

      $characterDetail.html(content).show();
      $characterForm.hide();
    };
  }

  $("#addCharacterButton").on("click", function (e) {
    $("#name").val("");
    $("#body").val("");
    $("#key").val("");
    $("#traits").val("");

    $characterDetail.hide();
    $characterForm.show();
  });

  $("#saveCharacterButton").on("click", function () {
    var name = $("#name").val();
    var body = $("#body").val();
    var key = $("#key").val();
    var namelc = name.toLowerCase();

    // handle traits
    var traits = [];
    var traitString = $("#traits").val();
    if (traitString.length) {
      traits = traitString.split(",");
    }

    var t = db.transaction([storeName], "readwrite");

    if (key === "") {
      t.objectStore(storeName).add({
        name: name,
        body: body,
        updated: new Date(),
        namelc: namelc,
        traits: traits
      });
    } else {
      t.objectStore(storeName).put({
        name: name,
        body: body,
        updated: new Date(),
        id: Number(key),
        namelc: namelc,
        traits: traits
      });
    }

    t.oncomplete = function (event) {
      $("#key").val("");
      $("#name").val("");
      $("#body").val("");
      $("#traits").val("");

      displayCharacters();
      doCount();

      $characterForm.hide();
    };

    return false;
  });

  $("#filterField").on("keyup", function (e) {
    var filter = $(this).val();
    displayCharacters(filter);
  });

  $(document).on("click", ".tagLookup", function (e) {
    var trait = e.target.text;
    var parentCharacter = $(this).data("characterid");
    var doneOne = false;
    var content = "<strong>Related Characters:</strong><br/>";

    var transaction = db.transaction([storeName], "readonly");
    var objectStore = transaction.objectStore(storeName);
    var traitIndex = objectStore.index("traits");
    var range = IDBKeyRange.only(trait);

    transaction.oncomplete = function (event) {
      if (!doneOne) {
        content += "No other characters have this trait.";
      }

      content += "<p/>";

      $("#relatedNotesDisplay").html(content);
    };

    var handleResult = function (event) {
      var cursor = event.target.result;
      if (cursor) {
        if (cursor.value.id != parentCharacter) {
          doneOne = true;
          content += "<a class='loadCharacter' data-characterid=" + cursor.value.id + ">" + cursor.value.name + "</a><br/>";
        }

        cursor.continue();
      }
    };
    
    traitIndex.openCursor(range).onsuccess = handleResult;
  });
  
  $(document).on("click", ".loadCharacter", function (e) {
    var characterId = $(this).data("characterid");
    displayNote(characterId);
  });
});