var express = require("express");
var app = express();
var request = require("request");
var rp = require('request-promise')

app.set("view engine","ejs");

app.use(express.static(__dirname));

app.get("/",function(req,res){
    res.render("home");
});

app.get("/results",function(req,res){
    var geoQuery = req.query.search;
    var geoUrl = "http://www.mapquestapi.com/geocoding/v1/address?key=ITjERZeg1yzFcu0mfxtzg8QspbdzyBnD&location="+geoQuery;
    rp({
      uri: geoUrl,
      headers: {
        'User-Agent': 'Request-Promise'
      },
      json: true
    }).then(data=>{
      let latLng = data["results"][0]["locations"][0]["latLng"];
      let lat = latLng["lat"];
      let lng = latLng["lng"];
      let boxCoordinates= (lat-2)+ "&swlng=" + (lng-2.5)+ "&nelat=" + (lat+2) + "&nelng=" + (lng+2.5);
      let mapUrl = "https://www.mapquestapi.com/staticmap/v5/map?key=" + process.env.MAPQUESTKEY + "&center=" + lat + "," + lng + "&zoom=5&scalebar=true&type=hyb&size=170,170@2x"
      let urls= [{
        name: "mammals",
        url: "https://www.inaturalist.org/observations.json?per_page=15&iconic_taxa[]=Mammalia&has[]=photos&has[]=geo&swlat=" + boxCoordinates
      },{
        name: 'birds',
        url: "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Aves&has[]=photos&has[]=geo&swlat=" + boxCoordinates
      },{
        name: 'reptiles',
        url: "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Reptilia&has[]=photos&has[]=geo&swlat=" + boxCoordinates
      },{
        name: 'fishes',
        url: "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Actinopterygii&iconic_taxa[]=Amphibia&has[]=photos&has[]=geo&swlat=" + boxCoordinates
      },{
        name: 'plants',
        url: "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Plantae&iconic_taxa[]=Fungi&has[]=photos&has[]=geo&swlat=" + boxCoordinates
      },{
        name: 'bugs',
        url: "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Insecta&iconic_taxa[]=Arachnida&has[]=photos&has[]=geo&swlat=" + boxCoordinates
      }]
      let requestCreatures = urls.map( species=> {
          return rp({
            uri: species.url,
            headers: {
            'User-Agent': 'Request-Promise'
          },
          json:true
        }).then(data=> {
          return addCreatures(data, species.name)
        })
      })
      Promise.all(requestCreatures).then((data)=>{
        let ncreatures = Object.assign({}, ...data)
        res.render("results", {map: mapUrl, creatures:ncreatures})
      })
    }).catch(error=>{
      console.log("Error " + error)
      res.render("error",{error:error})
    })
})

app.get("/info",function(req,res){
    let name = req.query.name;
    let sciname = req.query.sciname;
    let photos = parsePhotoString(req.query.photoUrl);
    let url = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&explaintext=1&exintro=1&titles="+ name.toLowerCase();
    rp({
      uri: url,
      headers: {
        'User-Agent': 'Request-Promise'
      },
      json: true
    }).then(data =>{
      let page = data["query"]["pages"];
      let paragraph;
      for(let key in page){
          paragraph = page[key]["extract"];
      };
      if(!paragraph || !validWikipedia(paragraph)){
          paragraph = "Sorry, there is no description at this time.";
      }
      res.render("info",{name:name, sciname:sciname, paragraph:paragraph, photos:photos});
    }).catch(error=>{
      var paragraph;
      console.log("Wikipedia Request Error " + error);
      res.render("error",{error:error});
    })
})

app.get("/about",function(req,res){
    res.render("about");
})

app.listen(process.env.PORT || 3000,function(){
    console.log("Server has started")
});

//takes in data, reconfigures it, and adds it to the creature object
//input is JSON data and the desired name of the array to be added to the creature object
function addCreatures(data, creatureName){
    let dataArray = [];
    let creaturesAdded=[];
    data.forEach(function(creature){
        //check if valid
        let id= creature["taxon_id"];
        if(checkDuplicate(id) === false && checkValid(creature)){
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
    });

function checkDuplicate(creatureId){
        if(creaturesAdded.indexOf(creatureId)!=-1) return true;
        else creaturesAdded.push(creatureId);
        return false;
    }

//checks if an iNaturalist entry has all the properties required to appear on site
function checkValid(creature){
        if(creature["taxon"]["common_name"] == null || creature["taxon"]["name"]== null ||
              creature["photos"][0]["medium_url"]==null) return false;
            //doesn't include terms "Human" and "Domestic"
        let creatureName = creature["taxon"]["common_name"]["name"];
        let avoidTerms = ["human","domestic","mammals","insects","plants"];
        let valid = true;
        avoidTerms.forEach(function(term){
            if(checkString(term,creatureName)===true){
                valid= false;
            }
        });
        return valid;
    };
    let newKey = {}
    newKey[creatureName] = dataArray
    return newKey
};

//determines if a substring exists within a larger string
function checkString(ss, ms){
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
}

//checks if string is valid wikipedia paragraph
function validWikipedia(wikiPara){
    var invalidTerms = ["redirect","{{"];
    var checkedPara = wikiPara.toLowerCase();
    var valid = true;
    invalidTerms.forEach(function(term){
        if(checkString(term,checkedPara)){
            valid = false;
        }
    });
    return valid;
}

//Turns a string of photo urls into an array of photo urls
function parsePhotoString(photoStr){
    if(photoStr === undefined) return "";
    let index = photoStr.indexOf(",");
    if (index === -1) return [photoStr];
    let currentUrl = [photoStr.slice(0,index)];
    return currentUrl.concat(parsePhotoString(photoStr.slice(index+1)));
}
