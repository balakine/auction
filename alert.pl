#!/usr/bin/perl

use CGI;
print "HTTP/1.0 200 OK\n"; # HTTPi hack
$q = CGI->new;
print $q->header(-type=>'application/json', -connection=>'close');
print '{}';

my $subject = $q->param("subject");
my $body = $q->param("body");
system("echo \"$body\" | mail -s \"$subject\" me\@mydomain.com");

return 1;
