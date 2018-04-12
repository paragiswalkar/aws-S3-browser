/*jslint devel: true, browser: true, unparam: true, vars: true, white: true, passfail: false, nomen: true, maxerr: 50, indent: 4, todo: true */

// This is a global variable of sha1.js and needs to be set for proper b64 encoded string.
b64pad = "="; // needed for "strict RFC compliance"

// common variables
	var iBytesUploaded = 0;
	var iBytesTotal = 0;
	var iPreviousBytesLoaded = 0;
	var oTimer = 0;

var FranticS3Browser = function () {
    "use strict";
    var bucket;
    var uploader_container_id;
    var aws_access_key_id;
    var aws_secret_access_key;
    var aws_signature;
    var protocolurl;
    var $login_form;
    var $login_error;
    var $logout_form;
    var $div_logout_form;
    var $bucketlist;
    var $fileupload_field;
    var $div_upload_form;
    var qs;

    var s3url = '.s3.amazonaws.com';
    var aws_canned_acl = 'private';
    var aws_policy_document;
    var aws_policy_document_b64;

    var set_aws_signature = function (as) {
            aws_signature = as;
    };

    var set_aws_access_key_id = function (aaki) {
        aws_access_key_id = aaki;
    };

    var set_aws_secret_access_key = function (asak) {
        aws_secret_access_key = asak;
    };

    var set_bucket = function (bn) {
        bucket = bn;
        // Certificate check will fail for bucket names with a dot. Use http for them, https for other buckets.
        if (/\./.exec(bn)) {
            protocolurl = 'http://';
        } else {
            protocolurl = 'https://';
        }
    };

    var set_bucketlist = function (selector) {
        $bucketlist = jQuery(selector);
        // Todo: If not found, alert here.
    };

    var set_fileupload_field = function (selector) {
        $fileupload_field = jQuery(selector);
        // Todo: If not found, alert here.
    };

    var set_div_upload_form = function (selector) {
        $div_upload_form = jQuery(selector);
        // Todo: If not found, alert here.
    };

    var make_aws_policy_document = function () {
        aws_policy_document = '{"expiration": "2020-12-01T12:00:00.000Z", "conditions": [{"acl": "' + aws_canned_acl + '"}, {"bucket": "' + bucket + '"},["starts-with", "$key", ""],["starts-with", "$Content-Type", ""]]}';
        aws_policy_document_b64 = rstr2b64(aws_policy_document);
    };

    var sign_api = function (expires, resource) {
        var http_verb = 'GET';
        var canonicalized_resource = '/' + bucket + resource;
        var string_to_sign = http_verb + "\n\n\n" + expires + "\n" + canonicalized_resource;
        var sig = b64_hmac_sha1(aws_secret_access_key, string_to_sign);
        return sig;
    };

    var location_hash = function (location_hash) {
        var i;
        var result = {};
        if (!location_hash) {
            return result;
        }
        var pairs = location_hash.substring(1).split("&");
        var splitPair;
        for (i=0; i < pairs.length; i++) {
            splitPair = pairs[i].split("=");
            result[decodeURIComponent(splitPair[0])] = decodeURIComponent(splitPair[1]);
        }
        return result;
    };

    var sign = function(aws_secret_access_key, string_to_sign) {
        var sig = b64_hmac_sha1(aws_secret_access_key, string_to_sign);
        return sig;
        // Authorization: AWS AWSAccessKeyId:Signature
        // http://docs.amazonwebservices.com/AmazonS3/2006-03-01/dev/RESTAuthentication.html
    };

    var generate_bucket_listing = function (files) {
        var i;
	var bytes = '';
        var out = '<span style="font-weight: bold; font-size: 20px; padding: 15px;">List of Files</span>';
		if(files.length==0){
			out += '<ul class="root" style="font-size:20px;"><li>Files Not Found</li></ul>';
		}else{
			out +='<ul class="root" id="myUL">';
			for (i=0; i < files.length; i++) {
				var name = jQuery(files[i]).find('Key').text();
			var size = jQuery(files[i]).find('Size').text();
			var modified = new Date(jQuery(files[i]).find('LastModified').text()); 	
				
							//Calculate File Size
							if (size >= 1073741824)
										{
											bytes = (size / 1073741824).toFixed(2) +' GB';
										}
										else if (size >= 1048576)
										{
											bytes = (size / 1048576).toFixed(2) +' MB';
										}
										else if (size >= 1024)
										{
											bytes = (size / 1024).toFixed(2) + ' KB';
										}
										else if (size > 1)
										{
											bytes = size + ' bytes';
										}
										else if (size == 1)
										{
											bytes = size + ' byte';
										}
										else
										{
											bytes = '0 bytes';
										}				

				// Skip files that end with a ~
				// Skip files that end with $folder$ (3hub files),
				if (/\$folder\$$/.exec(name) || /~$/.exec(name)) {
					continue;
				}
			
				var klass = 'file';
				var title = name;
				var url = protocolurl + bucket + s3url;

				var expires = new Date().valueOf();
				expires = parseInt(expires/1000); // milliseconds to seconds
				expires += 21600; // signed request valid for 6 hours
				var signedparamsdata = {'response-cache-control': 'No-cache', 'response-content-disposition': 'attachment'};
				var signedurl = '/' + encodeURIComponent(name) + '?' + jQuery.param(signedparamsdata);
				var signature = sign_api(expires, signedurl);

				var paramsdata = {'AWSAccessKeyId': aws_access_key_id, 'Signature': signature, 'Expires': expires};
				url += signedurl + '&' + jQuery.param(paramsdata);

				out += '<li class="' + klass + '"><a href="' + url + '" title="Download">'+'<i class="fa fa-arrow-circle-o-down" aria-hidden="true"></i> ' + "<span class='name'>" +title+ "</span>" +" - "+(bytes)+" - "+modified+ '</a>' + '</li>';
			}
			out += "</ul>";
		}
        $bucketlist.html(out);
		/* $bucketlist.easyPaginate({
				elementsPerPage: 50,
				effect: 'default'
		}); */
    };

    var set_endpoint = function (endpoint) {
        s3url = '.' + endpoint;
    };

    var init_bucketlist = function () {
        var expires = new Date().valueOf();
        expires = parseInt(expires/1000); // milliseconds to seconds
        expires += 21600; // signed request valid for 6 hours
        var signature = sign_api(expires, '/');
        jQuery(function() {
                $.ajax({
                        url: protocolurl + bucket + s3url + '/',
                        data: {'AWSAccessKeyId': aws_access_key_id, 'Signature': signature, 'Expires': expires},
                        dataFormat: 'xml',
                        cache: false,
						beforeSend: function(){
							$('#sign_in').hide();
							$('#wait_id').show();
						},
                        success: function(data) {
							$login_form.hide();
                            $login_error.hide();
							$('#row_contnet').hide();
                            $("#logout").show();
                            $bucketlist.show();
                            set_location_hash({'bucket': bucket, 'aws_access_key_id': aws_access_key_id, 'aws_secret_access_key': aws_secret_access_key});
                            $div_upload_form.show();
                            $("#div_login_form").addClass('login');
                            var contents = jQuery(data).find('Contents');
                            var files = [];
                            var i;
                            for (i = 0; i < contents.length; i++) {
                                files.push(jQuery(contents[i]));
                            }
                            files.sort(function(a, b){return b-a});
                            generate_bucket_listing(files);
							
							$('#searchlist').html('<div style="margin: auto;padding: 22px;"><input type="text" id="myInput" onkeyup="myFunction()" placeholder="Search for Files.."></div>');
							$("#listbucket").html('<div id="page-wrapper"><div class="row">\
                <div class="col-lg-12">\
                    <div class="panel panel-primary">\
                        <!-- Panel including bucket/folder information and controls -->\
                        <div class="panel-heading clearfix">\
                            <!-- Bucket selection and breadcrumbs -->\
                            <div class="btn-group pull-left">\
                                <div class="pull-left">\
                                    AWS S3 Explorer&nbsp;\
                                </div>\
                                <!-- Bucket selection -->\
                                <div class="btn pull-left" id="bucket">\
                                    <i id="bucket-chooser" style="cursor: pointer;" class="fa fa-bitbucket fa-2x" title="Switch to a different S3 Bucket"></i>\
                                </div>\
                                <!-- Bucket breadcrumbs -->\
                                <div class="btn pull-right">\
                                    <ul id="breadcrumb" class="btn breadcrumb pull-right">\
                                        <li class="active dropdown">\
                                            <a href="#">&lt;bucket&gt;</a>\
                                        </li>\
                                    </ul>\
                                </div>\
                            </div>\
                            <!-- Folder/Bucket radio group and progress spinner -->\
                            <div class="btn-group pull-right">\
                                <div class="checkbox pull-left">\
                                    <label>\
                                        <input type="checkbox" id="hidefolders">&nbsp;Hide folders?\
                                    </label>\
                                    <!-- Folder/Bucket radio group -->\
                                    <div class="btn-group" data-toggle="buttons">\
                                        <label class="btn btn-primary active" title="View all objects in folder">\
                                            <i class="fa fa-angle-double-up"></i>\
                                            <input type="radio" name="optionsdepth" value="folder" id="optionfolder" checked>&nbsp;Folder\
                                        </label>\
                                        <label class="btn btn-primary" title="View all objects in bucket">\
                                            <i class="fa fa-angle-double-down"></i>\
                                            <input type="radio" name="optionsdepth" value="bucket" id="optionbucket">&nbsp;Bucket\
                                        </label>\
                                    </div>\
                                </div>\
                                <!-- Dual purpose: progress spinner and refresh button -->\
                                <div class="btn-group pull-right" id="refresh">\
                                    <span id="bucket-loader" style="cursor: pointer;" class="btn fa fa-refresh fa-2x pull-left" title="Refresh"></span>\
                                    <span id="badgecount" class="badge pull-right">42</span>\
                                </div>\
                            </div>\
                        </div>\
                        <!-- Panel including S3 object table -->\
                        <div class="panel-body">\
                            <table class="table table-bordered table-hover table-striped" id="tb-s3objects">\
                                <thead>\
                                    <tr>\
                                        <th>Object</th>\
                                        <th>Folder</th>\
                                        <th>Last Modified</th>\
                                        <th>Size</th>\
                                    </tr>\
                                </thead>\
                                <tbody id="tbody-s3objects"></tbody>\
                            </table>\
                        </div>\
                    </div>\
                </div>\
            </div></div>');
                        },
                        error: function(xhr, textStatus, errorThrown) {
							if (xhr.status === 0) {
								document.getElementById('login_error').innerHTML = 'Not connected. Verify Network.';
                            } else if (xhr.status == 404) {
								document.getElementById('login_error').innerHTML = 'Requested page not found. [404]';
                            } else if (xhr.status == 500) {
								document.getElementById('login_error').innerHTML = 'Server Error [500].';
                            } else if (errorThrown === 'parsererror') {
								document.getElementById('login_error').innerHTML = 'Requested JSON parse failed.';
                            } else if (errorThrown === 'timeout') {
								document.getElementById('login_error').innerHTML = 'Time out error.';
                            } else if (errorThrown === 'abort') {
								document.getElementById('login_error').innerHTML = 'Ajax request aborted.';
                            } else {
								//document.getElementById('login_error').innerHTML = 'Remote sever unavailable. Please try later';
								document.getElementById('login_error').innerHTML = "Access ID or Password is wrong or you can't permission to access this bucket";
                            }
                            $login_error.show();
							$('#login_error').delay(10000).fadeOut();
							$('#sign_in').show();
							$('#wait_id').hide();
                        }
                    });
            });
    };

    var init_fileupload_field = function () {
	
        $fileupload_field.fileupload({
            url: protocolurl + bucket + s3url + '/',
            type: 'POST',
            autoUpload: true,
			sequentialUploads:true,	
			//limitConcurrentUploads: 1,
			maxChunkSize: 1000000000, // 10 MB
			maxRetries: 100,
			//retryTimeout: 500,
			//uploadedBytes:1000000000,
			multipart: true,
			//recalculateProgress: true,
			progressInterval: 100,
			bitrateInterval: 500,
			progressall: function(e, data){
                	// This is what makes everything really cool, thanks to that callback
                	// you can now update the progress bar based on the upload progress.
                	if (data.lengthComputable) {
        			iBytesUploaded = data.loaded;
        			iBytesTotal = data.total;
        			var iPercentComplete = Math.round(data.loaded * 100 / data.total);
        			var iBytesTransfered = bytesToSize(iBytesUploaded);
				
				//sendRequest(data.files[0]);
        			
				//document.getElementById('progress_percent').innerHTML = iPercentComplete.toString() + '%';
        			document.getElementById('progress').style.width = (iPercentComplete).toString() + '%';
        			document.getElementById('b_transfered').innerHTML = iBytesTransfered;
				var secondsRemaining = (data.total - data.loaded) * 8 / data.bitrate;
				document.getElementById('remaining').innerHTML = secondsToTime(secondsRemaining);				
        			if (iPercentComplete == 100) {
            			//var oUploadResponse = document.getElementById('upload_response');
            			//oUploadResponse.innerHTML = '<h1>Please wait...processing</h1>';
            			//oUploadResponse.style.display = 'block';

        			}
    			} else {
        			document.getElementById('progress').innerHTML = 'unable to compute';
    			}
			// set inner timer
   			oTimer = setInterval(doInnerUpdates, 300);			
			
			
            	},
		add: function (e, data) {
            		//data.context = $('<p/>').text('Uploading...').appendTo('.data');
				/* data.context = $('<button/>').text('Upload')
                .appendTo(document.getElementById('upload_btn'))
                .click(function () {
                    //data.context = $('<p/>').text('Uploading...').replaceAll($(this));
                    data.formData = { 
            				key: '${filename}',
                    			AWSAccessKeyId: aws_access_key_id,
                    			acl: aws_canned_acl,
                    			policy: aws_policy_document_b64,
                    			signature: aws_signature,
                    			'Content-Type': 'application/octet-stream'
            				};
            		data.submit();
                });	 */
				data.formData = { 
            				key: '${filename}',
                    			AWSAccessKeyId: aws_access_key_id,
                    			acl: aws_canned_acl,
                    			policy: aws_policy_document_b64,
                    			signature: aws_signature,
                    			'Content-Type': 'application/octet-stream'
            				};
            	data.submit();
        	},
		/*formData: {
                    key: '${filename}',
                    AWSAccessKeyId: aws_access_key_id,
                    acl: aws_canned_acl,
                    policy: aws_policy_document_b64,
                    signature: aws_signature,
                    'Content-Type': 'application/octet-stream'
                },*/
        done: function(event, data){ init_bucketlist(); document.getElementById("upload_form").reset(); clearInterval(oTimer); alert("Upload "+data.originalFiles[0].name+" File Successfully."); },
		fail: function (e, data) {
				
				/* var r = confirm("Resume Your Upload!Click Ok");
				if (r == true) {
					var retry = function () {
					var file = data.files[0].size;
                        data.uploadedBytes = file;
                        // clear the previous data:
                        data.data = null;
                        data.submit();
					};
				} else {
					alert('File Upload has been canceled');
				} */	
            	alert('File Upload has been canceled');
            	console.warn('Error: ', data);

        	}
            }).on('fileuploadchunksend', function (e, data) {
          		if (data.uploadedBytes === 3145728 ) return false;
    		}).on('fileuploadchunkdone', function (e, data) {
      
    		});    
};
    
    var login_form_beforeSubmit = function (formData, jqForm, options) {
        set_bucket(jqForm.find('input[name=bucket]').val());
        make_aws_policy_document();
        set_aws_access_key_id(jqForm.find('input[name=aws_access_key_id]').val());
        set_aws_secret_access_key(jqForm.find('input[name=aws_secret_access_key]').val());
        set_aws_signature(sign(aws_secret_access_key, aws_policy_document_b64));
        init_bucketlist();
        init_fileupload_field();
        return false;
    };

    var init_login_form = function (form_selector, login_error_selector) {
        $login_form = jQuery(form_selector);
        $login_error = jQuery(login_error_selector);
        $login_form.ajaxForm({beforeSubmit: login_form_beforeSubmit});
    };

    var init_logout_form = function (form_selector, div_logout_form_selector) {
        $logout_form = jQuery(form_selector);
        $div_logout_form = jQuery(div_logout_form_selector);
    }

    var init_from_hash = function (arg_hash) {
        qs = location_hash(arg_hash);
        if (qs.bucket) {
            $login_form.find('input[name=bucket]').val(qs.bucket);
        }
        if (qs.aws_access_key_id) {
            $login_form.find('input[name=aws_access_key_id]').val(qs.aws_access_key_id);
        }
        if (qs.aws_secret_access_key) {
            $login_form.find('input[name=aws_secret_access_key]').val(qs.aws_secret_access_key);
        }
    };

    var set_location_hash = function (args) {
        window.location.hash = 'bucket=' + encodeURIComponent(bucket) + '&aws_access_key_id=' + encodeURIComponent(aws_access_key_id) + '&aws_secret_access_key=' + encodeURIComponent(aws_secret_access_key);
    };
        
    var init_autosubmit = function () {
        // Auto-submit form if all 3 params were given in qs
        if (qs.bucket && qs.aws_access_key_id && qs.aws_secret_access_key) {
            $login_form.submit();
        }
    };

    var init_dropzone_effect = function () {
        jQuery(document).bind('drop dragover', function (e) {
                var dropZone = $div_upload_form,
                timeout = window.dropZoneTimeout;
                if (!timeout) {
                    dropZone.addClass('in');
                } else {
                    clearTimeout(timeout);
                }
                if (e.target === dropZone[0]) {
                    dropZone.addClass('hover');
                } else {
                    dropZone.removeClass('hover');
                }
                window.dropZoneTimeout = setTimeout(function () {
                        window.dropZoneTimeout = null;
                        dropZone.removeClass('in hover');
                }, 100);
        });
    };

    return {
        set_aws_access_key_id: function (args) {
            set_aws_access_key_id(args);
        },
        init: function (args) {
            set_endpoint(args.s3_endpoint);
            init_login_form(args.login_form, args.login_error);
            init_logout_form(args.logout_form, args.div_logout_form);
            init_from_hash(args.hash);
            set_bucketlist(args.bucketlist);
            set_fileupload_field(args.fileupload_field);
            set_div_upload_form(args.div_upload_form);
            init_dropzone_effect();
            init_autosubmit();
        }
    };
};

function secondsToTime(secs) { // we will use this function to convert seconds in normal time format
    var hr = Math.floor(secs / 3600);
    var min = Math.floor((secs - (hr * 3600))/60);
    var sec = Math.floor(secs - (hr * 3600) -  (min * 60));

    if (hr < 10) {hr = "0" + hr; }
    if (min < 10) {min = "0" + min;}
    if (sec < 10) {sec = "0" + sec;}
    if (hr) {hr = "00";}
    return hr + ':' + min + ':' + sec;
};
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};
function doInnerUpdates() { // we will use this function to display upload speed
    var iCB = iBytesUploaded;
    var iDiff = iCB - iPreviousBytesLoaded;

    // if nothing new loaded - exit
    if (iDiff == 0)
        return;

    iPreviousBytesLoaded = iCB;
    iDiff = iDiff * 2;
    var iBytesRem = iBytesTotal - iPreviousBytesLoaded;
    var secondsRemaining = iBytesRem / iDiff;

    // update speed info
    var iSpeed = iDiff.toString() + 'B/s';
    if (iDiff > 1024 * 1024) {
        iSpeed = (Math.round(iDiff * 100/(1024*1024))/100).toString() + 'MB/s';
    } else if (iDiff > 1024) {
        iSpeed =  (Math.round(iDiff * 100/1024)/100).toString() + 'KB/s';
    }

    document.getElementById('speed').innerHTML = iSpeed;        
};
function sendRequest(blob) {
                var blob = blob;
                const BYTES_PER_CHUNK = 10000000; // 10MB chunk sizes.
                const SIZE = blob.size;
                var start = 0;
                var end = BYTES_PER_CHUNK;
                while( start < SIZE ) {
                    var chunk = blob.slice(start, end);
                    //init_fileupload_field(chunk);
                    start = end;
                    end = start + BYTES_PER_CHUNK;
                }
            };
//List Bucket			
var s3exp_config = { Region: 'ap-southeast-1', Bucket: bucket, Prefix: '', Delimiter: '/' };
var s3exp_lister = null;
var s3exp_columns = { key:1, folder:2, date:3, size:4 };

AWS.config.region = 'ap-southeast-1';
console.log('Region: ' + AWS.config.region);

// Initialize S3 SDK and the moment library (for time formatting utilities)
var s3 = new AWS.S3();
moment().format();

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    var ii = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, ii), 2) + ' ' + sizes[ii];
}

// Custom endsWith function for String prototype
if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str){
        return this.slice(-str.length) == str;
    };
}

function object2hrefvirt(bucket, object) {
    if (AWS.config.region === "ap-southeast-1") {
        return document.location.protocol + '//' + bucket + '.s3.amazonaws.com/' + object;
    } else {
        return document.location.protocol + '//' + bucket + '.s3-' + AWS.config.region + '.amazonaws.com/' + object;
    }
}

function object2hrefpath(bucket, object) {
    if (AWS.config.region === "ap-southeast-1") {
        return document.location.protocol + "//s3.amazonaws.com/" + bucket + "/" + object;
    } else {
        return document.location.protocol + "//s3-' + AWS.config.region + '.amazonaws.com/" + bucket + "/" + object;
    }
}

function isthisdocument(bucket, object) {
    return object === "index.html";
}

function isfolder(path) {
    return path.endsWith('/');
}

// Convert cars/vw/golf.png to golf.png
function fullpath2filename(path) {
    return path.replace(/^.*[\\\/]/, '');
}

// Convert cars/vw/golf.png to cars/vw
function fullpath2pathname(path) {
    return path.substring(0, path.lastIndexOf('/'));
}

// Convert cars/vw/ to vw/
function prefix2folder(prefix) {
    var parts = prefix.split('/');
    return parts[parts.length-2] + '/';
}

// We are going to generate bucket/folder breadcrumbs. The resulting HTML will
// look something like this:
//
// <li>Home</li>
// <li>Library</li>
// <li class="active">Samples</li>
//
// Note: this code is a little complex right now so it would be good to find
// a simpler way to create the breadcrumbs.
function folder2breadcrumbs(data) {
    console.log('Bucket: ' + data.params.Bucket);
    console.log('Prefix: ' + data.params.Prefix);

    // The parts array will contain the bucket name followed by all the
    // segments of the prefix, exploded out as separate strings.
    var parts = [data.params.Bucket];

    if (data.params.Prefix) {
        parts.push.apply(parts,
                         data.params.Prefix.endsWith('/') ?
                         data.params.Prefix.slice(0, -1).split('/') :
                         data.params.Prefix.split('/'));
    }

    console.log('Parts: ' + parts + ' (length=' + parts.length + ')');

    // Empty the current breadcrumb list
    $('#breadcrumb li').remove();

    // Now build the new breadcrumb list
    var buildprefix = '';
    $.each(parts, function(ii, part) {
        var ipart;

        // Add the bucket (the bucket is always first)
        if (ii === 0) {
            var a1 = $('<a>').attr('href', '#').text(part);
            ipart = $('<li>').append(a1);
            a1.click(function(e) {
                e.preventDefault();
                console.log('Breadcrumb click bucket: ' + data.params.Bucket);
                s3exp_config = {Bucket: data.params.Bucket, Prefix: '', Delimiter: data.params.Delimiter};
                (s3exp_lister = s3list(s3exp_config, s3draw)).go();
            });
        // Else add the folders within the bucket
        } else {
            buildprefix += part + '/';

            if (ii == parts.length - 1) {
                ipart = $('<li>').addClass('active').text(part);
            } else {
                var a2 = $('<a>').attr('href', '#').append(part);
                ipart = $('<li>').append(a2);

                // Closure needed to enclose the saved S3 prefix
                (function() {
                    var saveprefix = buildprefix;
                    // console.log('Part: ' + part + ' has buildprefix: ' + saveprefix);
                    a2.click(function(e) {
                        e.preventDefault();
                        console.log('Breadcrumb click object prefix: ' + saveprefix);
                        s3exp_config = {Bucket: data.params.Bucket, Prefix: saveprefix, Delimiter: data.params.Delimiter};
                        (s3exp_lister = s3list(s3exp_config, s3draw)).go();
                    });
                })();
            }
        }
        $('#breadcrumb').append(ipart);
    });
}

function s3draw(data, complete) {
    $('li.li-bucket').remove();
    folder2breadcrumbs(data);

    // Add each part of current path (S3 bucket plus folder hierarchy) into the breadcrumbs
    $.each(data.CommonPrefixes, function(i, prefix) {
        $('#tb-s3objects').DataTable().rows.add([{Key: prefix.Prefix}]);
    });

    // Add S3 objects to DataTable
    $('#tb-s3objects').DataTable().rows.add(data.Contents).draw();
}

function s3list(config, completecb) {
    console.log('s3list config: ' + JSON.stringify(config));
    var params = { Bucket: config.Bucket, Prefix: config.Prefix, Delimiter: config.Delimiter };
    var scope = {
        Contents: [], CommonPrefixes:[], params: params, stop: false, completecb: completecb
    };

    return {
        // This is the callback that the S3 API makes when an S3 listObjects
        // request completes (successfully or in error). Note that a single call
        // to listObjects may not be enough to get all objects so we need to
        // check if the returned data is truncated and, if so, make additional
        // requests with a 'next marker' until we have all the objects.
        cb: function (err, data) {
            if (err) {
                console.log('Error: ' + JSON.stringify(err));
                console.log('Error: ' + err.stack);
                scope.stop = true;
                $('#bucket-loader').removeClass('fa-spin');
                bootbox.alert("Error accessing S3 bucket " + scope.params.Bucket + ". Error: " + err);
            } else {
                // console.log('Data: ' + JSON.stringify(data));
                console.log("Options: " + $("input[name='optionsdepth']:checked").val());

                // Store marker before filtering data
                if (data.IsTruncated) {
                    if (data.NextMarker) {
                        scope.params.Marker = data.NextMarker;
                    } else if (data.Contents.length > 0) {
                        scope.params.Marker = data.Contents[data.Contents.length - 1].Key;
                    }
                }

                // Filter the folders out of the listed S3 objects
                // (could probably be done more efficiently)
                console.log("Filter: remove folders");
                data.Contents = data.Contents.filter(function(el) {
                    return el.Key !== scope.params.Prefix;
                });

                // Accumulate the S3 objects and common prefixes
                scope.Contents.push.apply(scope.Contents, data.Contents);
                scope.CommonPrefixes.push.apply(scope.CommonPrefixes, data.CommonPrefixes);

                // Update badge count to show number of objects read
                $('#badgecount').text(scope.Contents.length + scope.CommonPrefixes.length);

                if (scope.stop) {
                    console.log('Bucket ' + scope.params.Bucket + ' stopped');
                } else if (data.IsTruncated) {
                    console.log('Bucket ' + scope.params.Bucket + ' truncated');
                    s3.makeUnauthenticatedRequest('listObjects', scope.params, scope.cb);
                } else {
                    console.log('Bucket ' + scope.params.Bucket + ' has ' + scope.Contents.length + ' objects, including ' + scope.CommonPrefixes.length + ' prefixes');
                    delete scope.params.Marker;
                    if (scope.completecb) {
                        scope.completecb(scope, true);
                    }
                    $('#bucket-loader').removeClass('fa-spin');
                }
            }
        },

        // Start the spinner, clear the table, make an S3 listObjects request
        go: function () {
            scope.cb = this.cb;
            $('#bucket-loader').addClass('fa-spin');
            $('#tb-s3objects').DataTable().clear();
            s3.makeUnauthenticatedRequest('listObjects', scope.params, this.cb);
        },

        stop: function () {
            scope.stop = true;
            delete scope.params.Marker;
            if (scope.completecb) {
                scope.completecb(scope, false);
            }
            $('#bucket-loader').removeClass('fa-spin');
        }
    };
}

function promptForBucketInput() {
    bootbox.prompt("Please enter the S3 bucket name", function(result) {
        if (result !== null) {
            resetDepth();
            s3exp_config = { Bucket: result, Delimiter: '/' };
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        }
    });
}

function resetDepth() {
    $('#tb-s3objects').DataTable().column(1).visible(false);
    $('input[name="optionsdepth"]').val(['folder']);
    $('input[name="optionsdepth"][value="bucket"]').parent().removeClass('active');
    $('input[name="optionsdepth"][value="folder"]').parent().addClass('active');
}

$(document).ready(function(){
    console.log('ready');

    // Click handler for refresh button (to invoke manual refresh)
    $('#bucket-loader').click(function(e) {
        if ($('#bucket-loader').hasClass('fa-spin')) {
            // To do: We need to stop the S3 list that's going on
            // bootbox.alert("Stop is not yet supported.");
            s3exp_lister.stop();
        } else {
            delete s3exp_config.Marker;
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        }
    });

    // Click handler for bucket button (to allow user to change bucket)
    $('#bucket-chooser').click(function(e) {
        promptForBucketInput();
    });

    $('#hidefolders').click(function(e) {
        $('#tb-s3objects').DataTable().draw();
    });

    // Folder/Bucket radio button handler
    $("input:radio[name='optionsdepth']").change(function() {
        console.log("Folder/Bucket option change to " + $(this).val());
        console.log("Change options: " + $("input[name='optionsdepth']:checked").val());

        // If user selected deep then we do need to do a full list
        if ($(this).val() == 'bucket') {
            console.log("Switch to bucket");
            var choice = $(this).val();
            $('#tb-s3objects').DataTable().column(1).visible(choice === 'bucket');
            delete s3exp_config.Marker;
            delete s3exp_config.Prefix;
            s3exp_config.Delimiter = '';
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        // Else user selected folder then can do a delimiter list
        } else {
            console.log("Switch to folder");
            $('#tb-s3objects').DataTable().column(1).visible(false);
            delete s3exp_config.Marker;
            delete s3exp_config.Prefix;
            s3exp_config.Delimiter = '/';
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        }
    });

    function renderObject(data, type, full) {
        if (isthisdocument(s3exp_config.Bucket, data)) {
            console.log("is this document: " + data);
            return fullpath2filename(data);
        } else if (isfolder(data)) {
            console.log("is folder: " + data);
            return '<a data-s3="folder" data-prefix="' + data + '" href="' + object2hrefvirt(s3exp_config.Bucket, data) + '">' + prefix2folder(data) + '</a>';
        } else {
            console.log("not folder/this document: " + data);
            return '<a data-s3="object" href="' + object2hrefvirt(s3exp_config.Bucket, data) + '">' + fullpath2filename(data) + '</a>';
        }
    }

    function renderFolder(data, type, full) {
        return isfolder(data) ? "" : fullpath2pathname(data);
    }

    // Initial DataTable settings
    $('#tb-s3objects').DataTable({
        iDisplayLength: 50,
        order: [[1, 'asc'], [0, 'asc']],
        aoColumnDefs: [
            { "aTargets": [ 0 ], "mData": "Key", "mRender": function (data, type, full) { return (type == 'display') ? renderObject(data, type, full) : data; }, "sType": "key" },
            { "aTargets": [ 1 ], "mData": "Key", "mRender": function (data, type, full) { return renderFolder(data, type, full); } },
            { "aTargets": [ 2 ], "mData": "LastModified", "mRender": function (data, type, full) { return data ? moment(data).fromNow() : ""; } },
            { "aTargets": [ 3 ], "mData": function (source, type, val) { return source.Size ? ((type == 'display') ? bytesToSize(source.Size) : source.Size) : ""; } },
        ]
    });

    $('#tb-s3objects').DataTable().column(s3exp_columns.key).visible(false);
    console.log("jQuery version=" + $.fn.jquery);

    // Custom sort for the Key column so that folders appear before objects
    $.fn.dataTableExt.oSort['key-asc']  = function(a,b) {
        var x = (isfolder(a) ? "0-" + a : "1-" + a).toLowerCase();
        var y = (isfolder(b) ? "0-" + b : "1-" + b).toLowerCase();
        return ((x < y) ? -1 : ((x > y) ?  1 : 0));
    };

    $.fn.dataTableExt.oSort['key-desc'] = function(a,b) {
        var x = (isfolder(a) ? "1-" + a : "0-" + a).toLowerCase();
        var y = (isfolder(b) ? "1-" + b : "0-" + b).toLowerCase();
        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };

    // Allow user to hide folders
    $.fn.dataTableExt.afnFiltering.push(function (oSettings, aData, iDataIndex) {
        console.log("hide folders");
        return $('#hidefolders').is(':checked') ? !isfolder(aData[0]) : true;
    });

    // Delegated event handler for S3 object/folder clicks. This is delegated
    // because the object/folder rows are added dynamically and we do not want
    // to have to assign click handlers to each and every row.
    $('#tb-s3objects').on('click', 'a', function(event) {
        event.preventDefault();
        var target = event.target;
        console.log("target href=" + target.href);
        console.log("target dataset=" + JSON.stringify(target.dataset));

        // If the user has clicked on a folder then navigate into that folder
        if (target.dataset.s3 === "folder") {
            resetDepth();
            delete s3exp_config.Marker;
            s3exp_config.Prefix = target.dataset.prefix;
            s3exp_config.Delimiter = $("input[name='optionsdepth']:checked").val() == "folder" ? "/" : "";
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        // Else user has clicked on an object so download it in new window/tab
        } else {
            window.open(target.href, '_blank');
        }
        return false;
    });

    // Document URL typically looks like this for path-style URLs:
    // - https://s3.amazonaws.com/mybucket1/index.html
    // - https://s3-us-west-2.amazonaws.com/mybucket2/index.html
    //
    // Document URL typically looks like this for virtual-hosted-style URLs:
    // - https://mybucket1.s3.amazonaws.com/index.html
    // - https://mybucket2.s3-us-west-2.amazonaws.com/index.html
    //
    // Document URL typically looks like this for S3 website hosting:
    // - http://mybucket3.s3-website-ap-southeast-1.amazonaws.com/
    // - http://mybucket4.s3-website.eu-central-1.amazonaws.com/

    // TODO: need to support S3 website hosting option
    //
    // If we're launched from a bucket then let's try to determine the bucket
    // name so we can query it immediately, without requiring the user to
    // supply the bucket name.
    //
    // If the region was anything other than US Standard then we will also need
    // to infer the region so that we can initialize the S3 SDK properly.
    console.log("Document URL: " + document.URL);
    var urls = document.URL.split('/');
    console.log("URL split: " + urls);

    // Using technique from https://gist.github.com/jlong/2428561
    // to parse the document URL.
    var parser = document.createElement('a');
    parser.href = document.URL;

    // URL format is scheme://[user:password@]domain:port/path?query_string#fragment_id
    // For example: http://example.com:3000/path/?name=abc#topic
    console.log("protocol: " + parser.protocol); // => "http:"
    console.log("hostname: " + parser.hostname); // => "example.com"
    console.log("port    : " + parser.port);     // => "3000"
    console.log("pathname: " + parser.pathname); // => "/path/"
    console.log("search  : " + parser.search);   // => "?name=abc"
    console.log("hash    : " + parser.hash);     // => "#topic"
    console.log("host    : " + parser.host);     // => "example.com:3000"

    // If initial bucket has been hard-coded above then use it, else try to
    // derive the initial bucket from the document URL (useful if index.html was
    // launched directly from within a bucket), else prompt the user.
    if (s3exp_config.Bucket) {
        (s3exp_lister = s3list(s3exp_config, s3draw)).go();
    } else if (parser.hostname.endsWith('amazonaws.com')) {
        // Hostname is likely to be in one of the following forms:
        // - s3.amazonaws.com
        // - bucket1.s3.amazonaws.com
        // - s3-us-west-2.amazonaws.com
        // - bucket2.s3-us-west-2.amazonaws.com

        var bucket;
        var region;
        var hostnames = parser.hostname.split('.');
        var pathnames = parser.pathname.split('/');

        console.log("count of words in hostname=" + hostnames.length);
        console.log("count of words in pathname=" + pathnames.length);

        // If bucket included in hostname
        if (hostnames.length == 4) {
            bucket = hostnames[0];
            region = hostnames[1];
            console.log("host bucket=" + bucket);
            console.log("host region=" + region);
        } else {
            bucket = pathnames[1];
            region = hostnames[0];
            console.log("path bucket=" + bucket);
            console.log("path region=" + region);
        }

        // If we found explicit region, for example s3-us-west-2, then use it
        // else use the default of US Standard
        if (region !== 's3') {
            AWS.config.region = region.substring(3);
        }

        console.log("AWS region=" + AWS.config.region);

        // Create and initialize S3 object
        s3 = new AWS.S3();
        s3exp_config = { Bucket: bucket, Delimiter: '/' };

        // Do initial bucket list
        (s3exp_lister = s3list(s3exp_config, s3draw)).go();
    } else {
        promptForBucketInput();
    }
});			
//List Bucket
var s3exp_config = { Region: 'ap-southeast-1', Bucket: bucket, Prefix: '', Delimiter: '/' };
var s3exp_lister = null;
var s3exp_columns = { key:1, folder:2, date:3, size:4 };

AWS.config.region = 'ap-southeast-1';
console.log('Region: ' + AWS.config.region);

// Initialize S3 SDK and the moment library (for time formatting utilities)
var s3 = new AWS.S3();
moment().format();

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    var ii = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, ii), 2) + ' ' + sizes[ii];
}

// Custom endsWith function for String prototype
if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str){
        return this.slice(-str.length) == str;
    };
}

function object2hrefvirt(bucket, object) {
    if (AWS.config.region === "ap-southeast-1") {
        return document.location.protocol + '//' + bucket + '.s3.amazonaws.com/' + object;
    } else {
        return document.location.protocol + '//' + bucket + '.s3-' + AWS.config.region + '.amazonaws.com/' + object;
    }
}

function object2hrefpath(bucket, object) {
    if (AWS.config.region === "ap-southeast-1") {
        return document.location.protocol + "//s3.amazonaws.com/" + bucket + "/" + object;
    } else {
        return document.location.protocol + "//s3-' + AWS.config.region + '.amazonaws.com/" + bucket + "/" + object;
    }
}

function isthisdocument(bucket, object) {
    return object === "index.html";
}

function isfolder(path) {
    return path.endsWith('/');
}

// Convert cars/vw/golf.png to golf.png
function fullpath2filename(path) {
    return path.replace(/^.*[\\\/]/, '');
}

// Convert cars/vw/golf.png to cars/vw
function fullpath2pathname(path) {
    return path.substring(0, path.lastIndexOf('/'));
}

// Convert cars/vw/ to vw/
function prefix2folder(prefix) {
    var parts = prefix.split('/');
    return parts[parts.length-2] + '/';
}

// We are going to generate bucket/folder breadcrumbs. The resulting HTML will
// look something like this:
//
// <li>Home</li>
// <li>Library</li>
// <li class="active">Samples</li>
//
// Note: this code is a little complex right now so it would be good to find
// a simpler way to create the breadcrumbs.
function folder2breadcrumbs(data) {
    console.log('Bucket: ' + data.params.Bucket);
    console.log('Prefix: ' + data.params.Prefix);

    // The parts array will contain the bucket name followed by all the
    // segments of the prefix, exploded out as separate strings.
    var parts = [data.params.Bucket];

    if (data.params.Prefix) {
        parts.push.apply(parts,
                         data.params.Prefix.endsWith('/') ?
                         data.params.Prefix.slice(0, -1).split('/') :
                         data.params.Prefix.split('/'));
    }

    console.log('Parts: ' + parts + ' (length=' + parts.length + ')');

    // Empty the current breadcrumb list
    $('#breadcrumb li').remove();

    // Now build the new breadcrumb list
    var buildprefix = '';
    $.each(parts, function(ii, part) {
        var ipart;

        // Add the bucket (the bucket is always first)
        if (ii === 0) {
            var a1 = $('<a>').attr('href', '#').text(part);
            ipart = $('<li>').append(a1);
            a1.click(function(e) {
                e.preventDefault();
                console.log('Breadcrumb click bucket: ' + data.params.Bucket);
                s3exp_config = {Bucket: data.params.Bucket, Prefix: '', Delimiter: data.params.Delimiter};
                (s3exp_lister = s3list(s3exp_config, s3draw)).go();
            });
        // Else add the folders within the bucket
        } else {
            buildprefix += part + '/';

            if (ii == parts.length - 1) {
                ipart = $('<li>').addClass('active').text(part);
            } else {
                var a2 = $('<a>').attr('href', '#').append(part);
                ipart = $('<li>').append(a2);

                // Closure needed to enclose the saved S3 prefix
                (function() {
                    var saveprefix = buildprefix;
                    // console.log('Part: ' + part + ' has buildprefix: ' + saveprefix);
                    a2.click(function(e) {
                        e.preventDefault();
                        console.log('Breadcrumb click object prefix: ' + saveprefix);
                        s3exp_config = {Bucket: data.params.Bucket, Prefix: saveprefix, Delimiter: data.params.Delimiter};
                        (s3exp_lister = s3list(s3exp_config, s3draw)).go();
                    });
                })();
            }
        }
        $('#breadcrumb').append(ipart);
    });
}

function s3draw(data, complete) {
    $('li.li-bucket').remove();
    folder2breadcrumbs(data);

    // Add each part of current path (S3 bucket plus folder hierarchy) into the breadcrumbs
    $.each(data.CommonPrefixes, function(i, prefix) {
        $('#tb-s3objects').DataTable().rows.add([{Key: prefix.Prefix}]);
    });

    // Add S3 objects to DataTable
    $('#tb-s3objects').DataTable().rows.add(data.Contents).draw();
}

function s3list(config, completecb) {
    console.log('s3list config: ' + JSON.stringify(config));
    var params = { Bucket: config.Bucket, Prefix: config.Prefix, Delimiter: config.Delimiter };
    var scope = {
        Contents: [], CommonPrefixes:[], params: params, stop: false, completecb: completecb
    };

    return {
        // This is the callback that the S3 API makes when an S3 listObjects
        // request completes (successfully or in error). Note that a single call
        // to listObjects may not be enough to get all objects so we need to
        // check if the returned data is truncated and, if so, make additional
        // requests with a 'next marker' until we have all the objects.
        cb: function (err, data) {
            if (err) {
                console.log('Error: ' + JSON.stringify(err));
                console.log('Error: ' + err.stack);
                scope.stop = true;
                $('#bucket-loader').removeClass('fa-spin');
                bootbox.alert("Error accessing S3 bucket " + scope.params.Bucket + ". Error: " + err);
            } else {
                // console.log('Data: ' + JSON.stringify(data));
                console.log("Options: " + $("input[name='optionsdepth']:checked").val());

                // Store marker before filtering data
                if (data.IsTruncated) {
                    if (data.NextMarker) {
                        scope.params.Marker = data.NextMarker;
                    } else if (data.Contents.length > 0) {
                        scope.params.Marker = data.Contents[data.Contents.length - 1].Key;
                    }
                }

                // Filter the folders out of the listed S3 objects
                // (could probably be done more efficiently)
                console.log("Filter: remove folders");
                data.Contents = data.Contents.filter(function(el) {
                    return el.Key !== scope.params.Prefix;
                });

                // Accumulate the S3 objects and common prefixes
                scope.Contents.push.apply(scope.Contents, data.Contents);
                scope.CommonPrefixes.push.apply(scope.CommonPrefixes, data.CommonPrefixes);

                // Update badge count to show number of objects read
                $('#badgecount').text(scope.Contents.length + scope.CommonPrefixes.length);

                if (scope.stop) {
                    console.log('Bucket ' + scope.params.Bucket + ' stopped');
                } else if (data.IsTruncated) {
                    console.log('Bucket ' + scope.params.Bucket + ' truncated');
                    s3.makeUnauthenticatedRequest('listObjects', scope.params, scope.cb);
                } else {
                    console.log('Bucket ' + scope.params.Bucket + ' has ' + scope.Contents.length + ' objects, including ' + scope.CommonPrefixes.length + ' prefixes');
                    delete scope.params.Marker;
                    if (scope.completecb) {
                        scope.completecb(scope, true);
                    }
                    $('#bucket-loader').removeClass('fa-spin');
                }
            }
        },

        // Start the spinner, clear the table, make an S3 listObjects request
        go: function () {
            scope.cb = this.cb;
            $('#bucket-loader').addClass('fa-spin');
            $('#tb-s3objects').DataTable().clear();
            s3.makeUnauthenticatedRequest('listObjects', scope.params, this.cb);
        },

        stop: function () {
            scope.stop = true;
            delete scope.params.Marker;
            if (scope.completecb) {
                scope.completecb(scope, false);
            }
            $('#bucket-loader').removeClass('fa-spin');
        }
    };
}

function promptForBucketInput() {
    bootbox.prompt("Please enter the S3 bucket name", function(result) {
        if (result !== null) {
            resetDepth();
            s3exp_config = { Bucket: result, Delimiter: '/' };
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        }
    });
}

function resetDepth() {
    $('#tb-s3objects').DataTable().column(1).visible(false);
    $('input[name="optionsdepth"]').val(['folder']);
    $('input[name="optionsdepth"][value="bucket"]').parent().removeClass('active');
    $('input[name="optionsdepth"][value="folder"]').parent().addClass('active');
}

$(document).ready(function(){
    console.log('ready');

    // Click handler for refresh button (to invoke manual refresh)
    $('#bucket-loader').click(function(e) {
        if ($('#bucket-loader').hasClass('fa-spin')) {
            // To do: We need to stop the S3 list that's going on
            // bootbox.alert("Stop is not yet supported.");
            s3exp_lister.stop();
        } else {
            delete s3exp_config.Marker;
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        }
    });

    // Click handler for bucket button (to allow user to change bucket)
    $('#bucket-chooser').click(function(e) {
        promptForBucketInput();
    });

    $('#hidefolders').click(function(e) {
        $('#tb-s3objects').DataTable().draw();
    });

    // Folder/Bucket radio button handler
    $("input:radio[name='optionsdepth']").change(function() {
        console.log("Folder/Bucket option change to " + $(this).val());
        console.log("Change options: " + $("input[name='optionsdepth']:checked").val());

        // If user selected deep then we do need to do a full list
        if ($(this).val() == 'bucket') {
            console.log("Switch to bucket");
            var choice = $(this).val();
            $('#tb-s3objects').DataTable().column(1).visible(choice === 'bucket');
            delete s3exp_config.Marker;
            delete s3exp_config.Prefix;
            s3exp_config.Delimiter = '';
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        // Else user selected folder then can do a delimiter list
        } else {
            console.log("Switch to folder");
            $('#tb-s3objects').DataTable().column(1).visible(false);
            delete s3exp_config.Marker;
            delete s3exp_config.Prefix;
            s3exp_config.Delimiter = '/';
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        }
    });

    function renderObject(data, type, full) {
        if (isthisdocument(s3exp_config.Bucket, data)) {
            console.log("is this document: " + data);
            return fullpath2filename(data);
        } else if (isfolder(data)) {
            console.log("is folder: " + data);
            return '<a data-s3="folder" data-prefix="' + data + '" href="' + object2hrefvirt(s3exp_config.Bucket, data) + '">' + prefix2folder(data) + '</a>';
        } else {
            console.log("not folder/this document: " + data);
            return '<a data-s3="object" href="' + object2hrefvirt(s3exp_config.Bucket, data) + '">' + fullpath2filename(data) + '</a>';
        }
    }

    function renderFolder(data, type, full) {
        return isfolder(data) ? "" : fullpath2pathname(data);
    }

    // Initial DataTable settings
    $('#tb-s3objects').DataTable({
        iDisplayLength: 50,
        order: [[1, 'asc'], [0, 'asc']],
        aoColumnDefs: [
            { "aTargets": [ 0 ], "mData": "Key", "mRender": function (data, type, full) { return (type == 'display') ? renderObject(data, type, full) : data; }, "sType": "key" },
            { "aTargets": [ 1 ], "mData": "Key", "mRender": function (data, type, full) { return renderFolder(data, type, full); } },
            { "aTargets": [ 2 ], "mData": "LastModified", "mRender": function (data, type, full) { return data ? moment(data).fromNow() : ""; } },
            { "aTargets": [ 3 ], "mData": function (source, type, val) { return source.Size ? ((type == 'display') ? bytesToSize(source.Size) : source.Size) : ""; } },
        ]
    });

    $('#tb-s3objects').DataTable().column(s3exp_columns.key).visible(false);
    console.log("jQuery version=" + $.fn.jquery);

    // Custom sort for the Key column so that folders appear before objects
    $.fn.dataTableExt.oSort['key-asc']  = function(a,b) {
        var x = (isfolder(a) ? "0-" + a : "1-" + a).toLowerCase();
        var y = (isfolder(b) ? "0-" + b : "1-" + b).toLowerCase();
        return ((x < y) ? -1 : ((x > y) ?  1 : 0));
    };

    $.fn.dataTableExt.oSort['key-desc'] = function(a,b) {
        var x = (isfolder(a) ? "1-" + a : "0-" + a).toLowerCase();
        var y = (isfolder(b) ? "1-" + b : "0-" + b).toLowerCase();
        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };

    // Allow user to hide folders
    $.fn.dataTableExt.afnFiltering.push(function (oSettings, aData, iDataIndex) {
        console.log("hide folders");
        return $('#hidefolders').is(':checked') ? !isfolder(aData[0]) : true;
    });

    // Delegated event handler for S3 object/folder clicks. This is delegated
    // because the object/folder rows are added dynamically and we do not want
    // to have to assign click handlers to each and every row.
    $('#tb-s3objects').on('click', 'a', function(event) {
        event.preventDefault();
        var target = event.target;
        console.log("target href=" + target.href);
        console.log("target dataset=" + JSON.stringify(target.dataset));

        // If the user has clicked on a folder then navigate into that folder
        if (target.dataset.s3 === "folder") {
            resetDepth();
            delete s3exp_config.Marker;
            s3exp_config.Prefix = target.dataset.prefix;
            s3exp_config.Delimiter = $("input[name='optionsdepth']:checked").val() == "folder" ? "/" : "";
            (s3exp_lister = s3list(s3exp_config, s3draw)).go();
        // Else user has clicked on an object so download it in new window/tab
        } else {
            window.open(target.href, '_blank');
        }
        return false;
    });

    // Document URL typically looks like this for path-style URLs:
    // - https://s3.amazonaws.com/mybucket1/index.html
    // - https://s3-us-west-2.amazonaws.com/mybucket2/index.html
    //
    // Document URL typically looks like this for virtual-hosted-style URLs:
    // - https://mybucket1.s3.amazonaws.com/index.html
    // - https://mybucket2.s3-us-west-2.amazonaws.com/index.html
    //
    // Document URL typically looks like this for S3 website hosting:
    // - http://mybucket3.s3-website-ap-southeast-1.amazonaws.com/
    // - http://mybucket4.s3-website.eu-central-1.amazonaws.com/

    // TODO: need to support S3 website hosting option
    //
    // If we're launched from a bucket then let's try to determine the bucket
    // name so we can query it immediately, without requiring the user to
    // supply the bucket name.
    //
    // If the region was anything other than US Standard then we will also need
    // to infer the region so that we can initialize the S3 SDK properly.
    console.log("Document URL: " + document.URL);
    var urls = document.URL.split('/');
    console.log("URL split: " + urls);

    // Using technique from https://gist.github.com/jlong/2428561
    // to parse the document URL.
    var parser = document.createElement('a');
    parser.href = document.URL;

    // URL format is scheme://[user:password@]domain:port/path?query_string#fragment_id
    // For example: http://example.com:3000/path/?name=abc#topic
    console.log("protocol: " + parser.protocol); // => "http:"
    console.log("hostname: " + parser.hostname); // => "example.com"
    console.log("port    : " + parser.port);     // => "3000"
    console.log("pathname: " + parser.pathname); // => "/path/"
    console.log("search  : " + parser.search);   // => "?name=abc"
    console.log("hash    : " + parser.hash);     // => "#topic"
    console.log("host    : " + parser.host);     // => "example.com:3000"

    // If initial bucket has been hard-coded above then use it, else try to
    // derive the initial bucket from the document URL (useful if index.html was
    // launched directly from within a bucket), else prompt the user.
    if (s3exp_config.Bucket) {
        (s3exp_lister = s3list(s3exp_config, s3draw)).go();
    } else if (parser.hostname.endsWith('amazonaws.com')) {
        // Hostname is likely to be in one of the following forms:
        // - s3.amazonaws.com
        // - bucket1.s3.amazonaws.com
        // - s3-us-west-2.amazonaws.com
        // - bucket2.s3-us-west-2.amazonaws.com

        var bucket;
        var region;
        var hostnames = parser.hostname.split('.');
        var pathnames = parser.pathname.split('/');

        console.log("count of words in hostname=" + hostnames.length);
        console.log("count of words in pathname=" + pathnames.length);

        // If bucket included in hostname
        if (hostnames.length == 4) {
            bucket = hostnames[0];
            region = hostnames[1];
            console.log("host bucket=" + bucket);
            console.log("host region=" + region);
        } else {
            bucket = pathnames[1];
            region = hostnames[0];
            console.log("path bucket=" + bucket);
            console.log("path region=" + region);
        }

        // If we found explicit region, for example s3-us-west-2, then use it
        // else use the default of US Standard
        if (region !== 's3') {
            AWS.config.region = region.substring(3);
        }

        console.log("AWS region=" + AWS.config.region);

        // Create and initialize S3 object
        s3 = new AWS.S3();
        s3exp_config = { Bucket: bucket, Delimiter: '/' };

        // Do initial bucket list
        (s3exp_lister = s3list(s3exp_config, s3draw)).go();
    } else {
        promptForBucketInput();
    }
});