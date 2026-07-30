use strict;
use warnings;
use JSON::PP;
use MIME::Base64;

my $srcfile = 'index.html';
open my $fh, '<:raw', $srcfile or die $!;
my @lines = <$fh>;
close $fh;

my $manifest_raw = $lines[200]; # line 201
my $template_raw = $lines[208]; # line 209

my $manifest = decode_json($manifest_raw);
my $template = decode_json($template_raw);

open my $er, '<:raw', 'ext_resources.txt' or die $!;
my $er_raw = <$er>;
close $er;
my $ext_resources = decode_json($er_raw);

my %id_to_uuid;
for my $e (@$ext_resources) { $id_to_uuid{$e->{id}} = $e->{uuid}; }

mkdir 'assets' unless -d 'assets';

my %mime_ext = (
  'image/jpeg' => 'jpg',
  'image/png'  => 'png',
  'image/webp' => 'webp',
  'image/svg+xml' => 'svg',
  'image/gif'  => 'gif',
);

my %uuid_replacement;

for my $id (sort keys %id_to_uuid) {
  next if $id =~ m{^https?://};
  my $uuid = $id_to_uuid{$id};
  my $entry = $manifest->{$uuid};
  unless ($entry) { warn "no manifest entry for $id / $uuid\n"; next; }
  my $mime = $entry->{mime};
  my $ext = $mime_ext{$mime} || 'bin';
  if ($entry->{compressed}) { warn "unexpected compressed asset $id ($mime), skipping\n"; next; }
  my $bytes = decode_base64($entry->{data});
  my $fname = "assets/$id.$ext";
  open my $out, '>:raw', $fname or die $!;
  print $out $bytes;
  close $out;
  $uuid_replacement{$uuid} = "assets/$id.$ext";
  print "wrote $fname (" . length($bytes) . " bytes, $mime)\n";
}

my $react_uuid    = $id_to_uuid{'https://unpkg.com/react@18.3.1/umd/react.production.min.js'};
my $reactdom_uuid = $id_to_uuid{'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js'};
$uuid_replacement{$react_uuid}    = 'https://unpkg.com/react@18.3.1/umd/react.production.min.js' if $react_uuid;
$uuid_replacement{$reactdom_uuid} = 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js' if $reactdom_uuid;
$uuid_replacement{'e32b2a57-f56c-4d56-8ae0-c0d63cea9c6d'} = 'https://unpkg.com/@babel/standalone/babel.min.js';

for my $uuid (keys %uuid_replacement) {
  my $repl = $uuid_replacement{$uuid};
  $template =~ s/\Q$uuid\E/$repl/g;
}

my @leftover = ($template =~ /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g);
if (@leftover) {
  print "WARNING: leftover uuids not replaced: @{[ join(', ', @leftover) ]}\n";
}

open my $outhtml, '>:raw', 'index-clean.html' or die $!;
print $outhtml $template;
close $outhtml;
print "done, template length: " . length($template) . "\n";
