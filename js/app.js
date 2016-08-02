/**
 * Created by steffi on 27.04.16.
 */

var db;
var dbName = "character_db";
var storeName = "character";

/**
 * build the format for date and time
 * @param input
 * @returns {*}
 */
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

/**
 *
 */
$(document).ready(function () {
  if (!("indexedDB" in window)) {
    alert("IndexedDB support required for this demo!");
    return;
  }

  var $characterDetail = $("#characterDetail");
  var $characterForm = $("#characterForm");
  var $characterList = $("#characterList");

  var openRequest = window.indexedDB.open(dbName, 3);

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

    } else {
      //thisDb.close();
      objectStore = e.currentTarget.transaction.objectStore(storeName);


      objectStore.createIndex("familyMembers", "familyMembers", {
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

  /**
   * display filtered characters
   * @param filter Filter for specific characters
   * @return {void}
   */
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

    /**
     *
     * @param event
     */
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

  /**
   * count characters in the database
   * @return {void}
   */
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
      $("#nickname").val(character.nickname);
      $("#description").val(character.description);
      $("#age").val(character.age);
      $("#hairColor").val(character.hairColor);
      $("#eyeColor").val(character.eyeColor);
      $("#skinTone").val(character.skinTone);
      $("#race").val(character.race);
      $("#ethnicGroup").val(character.ethnicGroup);
      $("#citizenship").val(character.citizenship);
      $("#role").val(character.role);
      $("#marks").val(character.marks);
      $("#familyMembers").val(character.familyMembers.join(","));
      $("#traits").val(character.traits.join(","));

      $characterDetail.hide();
      $characterForm.show();
    };

    return false;
  });

  $characterList.on("click", "td", function () {
    var thisId = $(this).parent().data("key");

    displayCharacter(thisId);
  });

  /**
   * display a specific character
   * @param id Id of the caracter to display
   * @return {void}
   */
   displayCharacter = function (id) {
    var transaction = db.transaction([storeName]);
    var objectStore = transaction.objectStore(storeName);
    var request = objectStore.get(id);

    request.onsuccess = function (event) {
      var character = request.result;

      var content = "<h2>" + character.name + "</h2>";
      content += "<p><strong>Nickname:</strong> " + character.nickname + "</p>";
      content += "<p><strong>Description:</strong> " + character.description + "</p>";
      content += "<p><strong>Age:</strong> " + character.age + "</p>";
      content += "<p><strong>Hair Color:</strong> " + character.hairColor + "</p>";
      content += "<p><strong>Eye Color:</strong> " + character.eyeColor + "</p>";
      content += "<p><strong>Skin Tone:</strong> " + character.skinTone + "</p>";
      content += "<p><strong>Race:</strong> " + character.race + "</p>";
      content += "<p><strong>Ethnic Group:</strong> " + character.ethnicGroup + "</p>";
      content += "<p><strong>Citizenship:</strong> " + character.citizenship + "</p>";
      content += "<p><strong>Role in the Story:</strong> " + character.role + "</p>";
      content += "<p><strong>Notable Marks:</strong> " + character.marks + "</p>";

      // console.log(character.familyMembers);
      // console.log(character.traits);

      if (character.familyMembers.length > 0) {
        content += "<strong>Family Members:</strong> ";
        character.familyMembers.forEach(function (elm, idx, arr) {
          content += "<a class='familyLookup' title='Click for family members' data-characterid=" + character.id + ">" + elm + "</a>";
        });

        content += "<br/><div id='relatedCharactersDisplay'></div>";
      }

      if (character.traits.length > 0) {
        content += "<strong>Traits:</strong> ";
        character.traits.forEach(function (elm/*, idx, arr*/) {
          content += "<a class='traitLookup' title='Click for Related Characters' data-characterid=" + character.id + ">" + elm + "</a> ";
        });

        content += "<br/><div id='relatedCharactersDisplay'></div>";
      }

      $characterDetail.html(content).show();
      $characterForm.hide();
    };
  };

  $("#addCharacterButton").on("click", function (e) {
    $("#name").val("");
    $("#nickname").val("");
    $("#description").val("");
    $("#age").val("");
    $("#hairColor").val("");
    $("#eyeColor").val("");
    $("#skinTone").val("");
    $("#race").val("");
    $("#ethnicGroup").val("");
    $("#citizenship").val("");
    $("#role").val("");
    $("#marks").val("");
    $("#key").val("");
    $("#familyMembers").val("");
    $("#traits").val("");

    $characterDetail.hide();
    $characterForm.show();
  });

  $("#saveCharacterButton").on("click", function () {
    var name = $("#name").val();
    var nickname = $("#nickname").val();
    var description = $("#description").val();
    var age = $("#age").val();
    var hairColor = $("#hairColor").val();
    var eyeColor = $("#eyeColor").val();
    var skinTone = $("#skinTone").val();
    var race = $("#race").val();
    var ethnicGroup = $("#ethnicGroup").val();
    var citizenship = $("#citizenship").val();
    var role = $("#role").val();
    var marks = $("#marks").val();
    var key = $("#key").val();
    var namelc = name.toLowerCase();

    // handle family members
    var familyMembers = [];
    var familyString = $("#familyMembers").val();
    if (familyString.length) {
      familyMembers = familyString.split(",");
    }

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
        nickname: nickname,
        description: description,
        age: age,
        hairColor: hairColor,
        eyeColor: eyeColor,
        skinTone: skinTone,
        race: race,
        ethnicGroup: ethnicGroup,
        citizenship: citizenship,
        role: role,
        marks: marks,
        updated: new Date(),
        namelc: namelc,
        familyMembers: familyMembers,
        traits: traits
      });
    } else {
      t.objectStore(storeName).put({
        name: name,
        nickname: nickname,
        description: description,
        age: age,
        hairColor: hairColor,
        eyeColor: eyeColor,
        skinTone: skinTone,
        race: race,
        ethnicGroup: ethnicGroup,
        citizenship: citizenship,
        role: role,
        marks: marks,
        updated: new Date(),
        id: Number(key),
        namelc: namelc,
        familyMembers: familyMembers,
        traits: traits
      });
    }

    t.oncomplete = function (event) {
      $("#key").val("");
      $("#name").val("");
      $("#nickname").val("");
      $("#description").val("");
      $("#age").val("");
      $("#hairColor").val("");
      $("#eyeColor").val("");
      $("#skinTone").val("");
      $("#race").val("");
      $("#ethnicGroup").val("");
      $("#citizenship").val("");
      $("#role").val("");
      $("#marks").val("");
      $("#familyMembers").val("");
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

  // $(document).on("click", ".familyLookup", function (e) {
  //   var familyMember = e.target.text;
  //   var parentCharacter = $(this).data("characterid");
  //   var doneone = false;
  //   var content = "<strong>Family Members:</strong><br/>";
  //
  //   var transaction = db.transaction([storeName], "readonly");
  //   var objectStore = transaction.objectStore(storeName);
  //   var familyIndex = objectStore.index("familyMembers");
  //   var range = IDBKeyRange.only(familyMember);
  //
  //   transaction.oncomplete = function (event) {
  //     if (!doneone) {
  //       content += "No family member(s) found.";
  //     }
  //
  //     content += "<p/>";
  //
  //     $("#relatedNotesDisplay").html(content);
  //   };
  //
  //   var handleResult = function (event) {
  //     var cursor = event.target.result;
  //     if (cursor) {
  //       if (cursor.value.id != parentCharacter) {
  //         doneone = true;
  //         content += "<a class='loadCharacter' data-characterid=" + cursor.value.id + ">" + cursor.value.name + "</a><br/>";
  //       }
  //
  //       cursor.continue();
  //     }
  //   };
  //
  //   familyIndex.openCursor(range).onsuccess = handleResult;
  // });

  handleArray();

  // $(document).on("click", ".traitLookup", function (e) {
  //   var trait = e.target.text;
  //   var parentCharacter = $(this).data("characterid");
  //   var doneOne = false;
  //   var content = "<strong>Related Characters:</strong><br/>";
  //
  //   var transaction = db.transaction([storeName], "readonly");
  //   var objectStore = transaction.objectStore(storeName);
  //   var traitIndex = objectStore.index("traits");
  //   var range = IDBKeyRange.only(trait);
  //
  //   transaction.oncomplete = function (event) {
  //     if (!doneOne) {
  //       content += "No other characters have this trait.";
  //     }
  //
  //     content += "<p/>";
  //
  //     $("#relatedCharactersDisplay").html(content);
  //   };
  //
  //   var handleResult = function (event) {
  //     var cursor = event.target.result;
  //     if (cursor) {
  //       if (cursor.value.id != parentCharacter) {
  //         doneOne = true;
  //         content += "<a class='loadCharacter' data-characterid=" + cursor.value.id + ">" + cursor.value.name + "</a><br/>";
  //       }
  //
  //       cursor.continue();
  //     }
  //   };
  //
  //   traitIndex.openCursor(range).onsuccess = handleResult;
  // });
  
  $(document).on("click", ".loadCharacter", function (e) {
    var characterId = $(this).data("characterid");
    displayCharacter(characterId);
  });
});

/**
 * handles comma separated values of input text fields
 * @return {void}
 */
function handleArray() {
  $(document).on("click", ".familyLookup", function (e) {
    var familyMember = e.target.text;
    var doneOne = false;
    var parentCharacter = $(this).data("characterid");
    var content = "<strong>Family Members:</strong><br/>";

    var transaction = db.transaction([storeName], "readonly");
    var objectStore = transaction.objectStore(storeName);
    var familyIndex = objectStore.index("familyMembers");
    var range = IDBKeyRange.only(familyMember);
    transaction.oncomplete = function (event) {
      if (!doneOne) {
        content += "No family member(s) found.";
      }

      content += "<p/>";

      $("#relatedCharactersDisplay").html(content);
    };

    /**
     * handles result for a cursor
     * @param event
     * @return {void}
     */
    var handleResult = function (event) {
      var cursor = event.target.result;
      if (cursor) {
        if (cursor.value.id != parentCharacter) {
          doneOne = true;
          content += "<a onclick='displayCharacter(" + cursor.value.id + ");' class='loadCharacter' data-characterid=" + cursor.value.id + ">" + cursor.value.name + "</a><br/>";
        }

        cursor.continue();
      }
    };

    familyIndex.openCursor(range).onsuccess = handleResult;
  });

  $(document).on("click", ".traitLookup", function (e) {
    var trait = e.target.text;
    var doneOne = false;
    var parentCharacter = $(this).data("characterid");
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

      $("#relatedCharactersDisplay").html(content);
    };

    /**
     * handles result for a cursor
     * @param event
     * @return {void}
     */
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
}