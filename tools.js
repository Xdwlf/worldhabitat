const tools = {
  addCreatures: function (data, creatureName){
      let dataArray = [];
      let creaturesAdded=[];
      data.forEach(function(creature){
          //check if valid
          let id= creature["taxon_id"];
          if(checkDuplicate(id) === false && tools.isValidCreature(creature)){
              let newCreature = {
                name: creature["taxon"]["common_name"]["name"],
                'scientific-name': creature["taxon"]["name"],
                'photo-url': []
              };
              creature["photos"].forEach(function(picEntry){
                  newCreature["photo-url"].push(picEntry["medium_url"]);
              })
              dataArray.push(newCreature);
          }
      })
      function checkDuplicate(creatureId){
          if(creaturesAdded.indexOf(creatureId)!=-1) return true;
          else creaturesAdded.push(creatureId);
          return false;
      }
  //checks if an iNaturalist entry has all the properties required to appear on site
      let newKey = {}
      newKey[creatureName] = dataArray
      return newKey
  },
  isValidCreature : function (creature){
        if(creature["taxon"]["common_name"] == null || creature["taxon"]["name"]== null ||
              creature["photos"][0]["medium_url"]==null) return false;
            //doesn't include terms "Human" and "Domestic"
        let creatureName = creature["taxon"]["common_name"]["name"];
        let avoidTerms = ["human","domestic","mammals","insects","plants"];
        let valid = true;
        avoidTerms.forEach(function(term){
            if(tools.subStringOf(term,creatureName)===true){
                valid= false;
            }
        });
        return valid;
    },
  subStringOf: function (ss, ms){
      if(ss.length > ms || ss.length===0) return false;
      let subString= ss.toLowerCase();
      let mainString= ms.toLowerCase();
      let firstLetter = subString[0];
      for(let i = 0; i< mainString.length; i++){
          if(firstLetter==mainString[i]){
              if(subString=== mainString.slice(i,i+subString.length)) return true;
          }
      }
      return false;
  },
  validWikipedia: function(wikiPara){
      var invalidTerms = ["redirect","{{"];
      var checkedPara = wikiPara.toLowerCase();
      var valid = true;
      invalidTerms.forEach(function(term){
          if(tools.subStringOf(term,checkedPara)){
              valid = false;
          }
      });
      return valid;
  },
   formatPhotoString: function (photoStr){
      if(photoStr === undefined) return "";
      let index = photoStr.indexOf(",");
      if (index === -1) return [photoStr];
      let currentUrl = [photoStr.slice(0,index)];
      return currentUrl.concat(formatPhotoString(photoStr.slice(index+1)));
  }
}

module.exports= tools;
