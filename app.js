var express = require("express");
var app = express();
var request = require("request");
var config= require("./node_modules/config.js");

var creatures= {};

app.set("view engine","ejs");

app.use(express.static(__dirname));

app.get("/",function(req,res){
    res.render("home");
});

app.get("/results",function(req,res){
    var geoQuery = req.query.search;
    var geoUrl = "http://www.mapquestapi.com/geocoding/v1/address?key=ITjERZeg1yzFcu0mfxtzg8QspbdzyBnD&location="+geoQuery;
    request(geoUrl,function(error,response,body){
        if(!error && response.statusCode == 200){
            var data = JSON.parse(body);
            var latLng = data["results"][0]["locations"][0]["latLng"];
            var lat = latLng["lat"];
            var lng = latLng["lng"];
            var boxCoordinates= (lat-2)+ "&swlng=" + (lng-2.5)+ "&nelat=" + (lat+2) + "&nelng=" + (lng+2.5);
            var mapUrl= "https://www.mapquestapi.com/staticmap/v5/map?key=" + config.config.mapquestKey + "&center=" + lat + "," + lng + "&zoom=5&scalebar=true&type=hyb&size=170,170@2x"
            var animalUrl = "https://www.inaturalist.org/observations.json?per_page=15&iconic_taxa[]=Mammalia&has[]=photos&has[]=geo&swlat=" + boxCoordinates;
            var birdUrl= "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Aves&has[]=photos&has[]=geo&swlat=" + boxCoordinates;
            var reptileUrl= "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Reptilia&has[]=photos&has[]=geo&swlat=" + boxCoordinates;
            var fishUrl = "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Actinopterygii&iconic_taxa[]=Amphibia&has[]=photos&has[]=geo&swlat=" + boxCoordinates
            var plantUrl = "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Plantae&iconic_taxa[]=Fungi&has[]=photos&has[]=geo&swlat=" + boxCoordinates
            var bugsUrl = "https://www.inaturalist.org/observations.json?per_page=8&iconic_taxa[]=Insecta&iconic_taxa[]=Arachnida&has[]=photos&has[]=geo&swlat=" + boxCoordinates
            request(animalUrl,function(error,response,body){
                if(!error && response.statusCode == 200){
                    var animalList = JSON.parse(body);
                    addCreatures(animalList,"mammals");
                } else{
                    console.log("Error with animalUrl");
                    res.render("error",{error:error});
                }
            request(birdUrl,function(error, response, body) {
                if(!error && response.statusCode == 200){
                    var birdsList = JSON.parse(body);
                    addCreatures(birdsList,"birds");
                } else{
                    console.log("Error with birdUrl");
                   res.render("error",{error:error});
                }
                request(reptileUrl,function(error,response,body){
                    if(!error && response.statusCode == 200){
                        var reptileList = JSON.parse(body);
                        addCreatures(reptileList,"reptiles")
                } else{
                    console.log("Error with reptileUrl");
                    res.render("error",{error:error});
                }
                    request(fishUrl, function(error,response,body){
                        if(!error && response.statusCode == 200){
                            var fishList = JSON.parse(body);
                            addCreatures(fishList,"fishes");
                        } else{
                            console.log("Error with fishUrl");
                            res.render("error",{error:error});
                        }
                        request(plantUrl,function(error, response, body) {
                            if(!error && response.statusCode == 200){
                                var plantsList=JSON.parse(body);
                                addCreatures(plantsList,"plants");
                            } else{
                                console.log("Error with PlantsList");
                                res.render("error",{error:error});
                            }
                            request(bugsUrl,function(error,response,body){
                                if(!error && response.statusCode ==200){
                                    var bugsList = JSON.parse(body);
                                    addCreatures(bugsList,"bugs");
                                } else{
                                    console.log("Error with BugsList");
                                    res.render("error",{error:error});
                                }
                                res.render("results", {map: mapUrl, creatures:creatures});
                            })
                        })
                    })
                })
            });
            });
        } else res.render("error",{error:error});;
    })
})

app.get("/info",function(req,res){
    var name = req.query.name;
    var sciname = req.query.sciname;
    var photos = parsePhotoString(req.query.photoUrl);
    var url = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&explaintext=1&exintro=1&titles="+ name.toLowerCase();
     request(url,function(error, response, body) {
                if(!error && response.statusCode === 200){
                    var data = JSON.parse(body);
                    var page = data["query"]["pages"];
                    var paragraph;
                    for(var key in page){
                        paragraph = page[key]["extract"];
                    };
                    if(!paragraph){
                        paragraph = "Sorry, there is no description at this time.";
                    } else if(!validWikipedia(paragraph)){
                        paragraph = "Sorry, there is no description at this time.";
                    }
                    res.render("info",{name:name, sciname:sciname, paragraph:paragraph, photos:photos});
                } else{
                    console.log("Wikipedia Request Error" + error);
                    res.render("error",{error:error});
                }

            });

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
    var dataArray = [];
    var creaturesAdded=[];
    data.forEach(function(creature){
        //check if valid
        var id= creature["taxon_id"];
        if(checkDuplicate(id) === false && checkValid(creature)){
            //code to take important things out of dataset and put on a new object
            var newCreature = {};
            //Common name
            var commonName= creature["taxon"]["common_name"]["name"];
            //Scientific Name
            var scientificName = creature["taxon"]["name"];
            //Photo URL
            var photoUrl= [];
            creature["photos"].forEach(function(picEntry){
                photoUrl.push(picEntry["medium_url"]);
            })
            newCreature["name"] = commonName;
            newCreature["scientific-name"] = scientificName;
            newCreature["photo-url"]= photoUrl;
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

        if(creature["taxon"]["common_name"] == null) return false;
        if(creature["taxon"]["name"]== null) return false;
        if(creature["photos"][0]["medium_url"]==null) return false;
            //doesn't include terms "Human" and "Domestic"
        var creatureName = creature["taxon"]["common_name"]["name"];
        var avoidTerms = ["human","domestic","mammals","insects","plants"];
        var valid = true;
        avoidTerms.forEach(function(term){
            if(checkString(term,creatureName)===true){
                valid= false;
            }
        });
    //check if all entries exist

    return valid;
    };
    creatures[creatureName] = dataArray;
};

//determines if a substring exists within a larger string
function checkString(subString,mainString){
    if(subString.length > mainString) return false;
    if(subString.length===0) return false;
    subString= subString.toLowerCase();
    mainString=mainString.toLowerCase();
    let firstLetter = subString[0];
    for(var i = 0; i< mainString.length; i++){
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
    var index = photoStr.indexOf(",");
    if (index === -1) return [photoStr];
    var currentUrl = [photoStr.slice(0,index)];
    return currentUrl.concat(parsePhotoString(photoStr.slice(index+1)));
}
