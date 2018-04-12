AWS-S3-Browser
==================

AWS-S3-Browser is a file browser and uploader for Amazon S3. Fully HTML5 based,
no server needed.

You can serve AWS-S3-Browser from a single bucket and then create a bucket for each
customer/project you want to serve. AWS-S3-Browser is simply a browser-based client
to S3 enabling you and your users to download and upload files in buckets.

Setup: The website bucket for AWS-S3-Browser
================================================

 - Add a new bucket using https://console.aws.amazon.com/s3/home - pay attention
   that you place the bucket in the region you want it to be in. This bucket
   is used to serve the login website to your users. You can customize it to match
   your brand.

 - Add Bucket Policy for Website Access
   Select the bucket, press "Properties". In the Permissions tab press
   "Add Bucket Policy". Paste this in, replacing "YOURBUCKETNAME" with the name
   of your bucket, and save the policy:

```
   {
    "Version": "2008-10-17",
    "Statement": [
             {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "*"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::YOURBUCKETNAME/*"
             }
    ]
   }
```
 - Enable Website Access
   Select the "Website Access" tab in Properties. Check Enabled [X], specify
   "index.html" as the Index Document and "error.html" as the Error Document.
   Note the endpoint Amazon gives to you and write it down. Press Save.

 - Customize the s3_endpoint at the end of the index.html file. It is set to EU (Ireland) Region
   endpoint by default. See http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region
   for a listing of proper endpoints.

 - Upload all files of AWS-S3-Browser to the root of the website bucket you just created.

Setup: The bucket for a single customer's/project's data
========================================================
 - Add the bucket
   Add a new bucket using https://console.aws.amazon.com/s3/home - pay attention
   that you place the bucket in the region you want it to be in.

 - If you want the connection to be secure (HTTPS) do not use dots in the bucket name.
   Using dots in the bucket name will drop the connection to insecure HTTP.

 - Add a CORS policy to enable API requests
   Go back to Permissions tab and press "Add a CORS policy". Paste this in:

```
   <xml version="1.0" encoding="UTF-8"?>
   <CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
       <CORSRule>
           <AllowedOrigin>*</AllowedOrigin>
           <AllowedMethod>POST</AllowedMethod>
           <AllowedMethod>GET</AllowedMethod>
           <AllowedHeader>*</AllowedHeader>
       </CORSRule>
   </CORSConfiguration>
```

 - Add the user to access the bucket. Go to IAM, add a new user.
   Save the Security Credentials, you will need them later in the setup.
   Select the user's Permissions tab and add a Policy as follows.

```
   {
    "Statement": [
    {
      "Sid": "Stmnt1",
      "Action": [
        "s3:*"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::YOURBUCKETNAME","arn:aws:s3:::YOURBUCKETNAME/*"
      ]
    }
    ]
   }
```

 - Repeat this procedure for each customer/project bucket you need.

Setup: Customizing AWS-S3-Browser look and feel
===================================================
Edit css/branding.css.