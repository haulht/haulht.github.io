var cropobBasic;
var cropobCrop;
$(document).ready(function() {
  cropobBasic = $("#cropob_basic").croima({
    'image_url'	:'1.JPG',
  });
  cropobCrop = $("#cropob_crop").croima({
    'image_url' :'1.JPG',
    'type_feature': 2
  });
});

function downloadImgCropOB1(){
  if(!cropobCrop)
    return null;
  var data = cropobCrop.croima('getImageData');
  window.open(data);
}