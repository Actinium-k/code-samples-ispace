# -*- coding: utf-8 -*-

# !pip install sat-search
# !pip install rio-cogeo
# !pip install rio-tiler
# !pip install rio-tiler-pds

# # Restart if dateutil or sat-search gives errors

# !pip uninstall numpy -y
# !pip install numpy

# Import required libraries
import json
import shapely.geometry

from satsearch import Search

from rio_tiler_pds.sentinel.aws import S2COGReader

# Populate the notebook with numpy and matplotlib namespaces
# %pylab inline

# Set AWS credentials as environment variables for rio-tiler (no need to use boto3 thanks to that)
import os
os.environ['AWS_ACCESS_KEY_ID'] = ''
os.environ['AWS_SECRET_ACCESS_KEY'] = ''

# Define the possible indices
# Bands 1 to 9 need a 0 (B01 and not B1)
ndvi = "(B08-B04)/(B08+B04)"                      # (NIR-R) / (NIR+R)
ndmi = "(B08–B05)/(B04+B05)"                      # (NIR–SWIR) / (NIR+SWIR)
msi = "B05/B04"                                   # MidIR / NIR
bsi = "(B05+B03)–(B04+B02)/(B05+B03)+(B08+B02)"   # ((Red+SWIR) – (NIR+Blue)) / ((Red+SWIR) + (NIR+Blue))

# Select the desired indice for future calculations
formula = ndvi

# GeoJSON containing the AOIs
# Converted to GeoJSON from the .KML + only kept geometry (can be automated with string processing)
geojson = {
  "type": "FeatureCollection",
  "name": "AOI-vineyards",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "features": [
    { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [ [ [ -117.007202804089999, 33.543594457540998 ], [ -117.007395923139995, 33.543437970367997 ], [ -117.007728517060002, 33.543294896131997 ], [ -117.008281052109993, 33.542785192243997 ], [ -117.008120119569995, 33.542570579181998 ], [ -117.00781971216, 33.542606348062002 ], [ -117.007412016390006, 33.542736010131001 ], [ -117.006714642049999, 33.542914854045002 ], [ -117.007202804089999, 33.543594457540998 ] ] ] } },
    { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [ [ [ -117.008281052109993, 33.542744952336001 ], [ -117.007717788220006, 33.543308309352 ], [ -117.008093297480002, 33.543639168109998 ], [ -117.008511722090006, 33.543232301080003 ], [ -117.008554637429995, 33.543138408415999 ], [ -117.008281052109993, 33.542744952336001 ] ] ] } },
    { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [ [ [ -117.031945502479999, 33.533170462416997 ], [ -117.028598105629996, 33.534181037494001 ], [ -117.028458630759999, 33.533876971898998 ], [ -117.028050934990006, 33.533984289289997 ], [ -117.027600323870004, 33.533045257603 ], [ -117.028458630759999, 33.532866393268002 ], [ -117.030926263050006, 33.532902166165002 ], [ -117.031516349029999, 33.532705415050003 ], [ -117.031945502479999, 33.533170462416997 ] ] ] } },
    { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [ [ [ -117.088945170360006, 33.524047943706002 ], [ -117.089234848930005, 33.523895893225003 ], [ -117.088301440189994, 33.521785047167 ], [ -117.088011761619995, 33.521865546478999 ], [ -117.088945170360006, 33.524047943706002 ] ] ] } },
    { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [ [ [ -117.079006209970004, 33.537505455206002 ], [ -117.078841254119993, 33.537390051685001 ], [ -117.078550234440002, 33.537878539509002 ], [ -117.078574374319999, 33.537913318472 ], [ -117.079003527759994, 33.537508616944002 ], [ -117.079006209970004, 33.537505455206002 ] ] ] } },
    { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [ [ [ -117.078386847709993, 33.536802401948002 ], [ -117.078247372839996, 33.536840343107002 ], [ -117.078086440299998, 33.536283871110001 ], [ -117.078268830509998, 33.53630916537 ], [ -117.078386847709993, 33.536802401948002 ] ] ] } },
    { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [ [ [ -117.065972685814003, 33.5211021096503 ], [ -117.066251635550998, 33.522434821348597 ], [ -117.065865397452995, 33.522524264351397 ], [ -117.065511345863001, 33.521191554031297 ], [ -117.065961956978001, 33.521093165207098 ], [ -117.065972685814003, 33.5211021096503 ] ] ] } },
    { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [ [ [ -117.02309086919, 33.519413677388002 ], [ -117.023171335460006, 33.519249232443002 ], [ -117.023192793129994, 33.519116411298 ], [ -117.023233026270006, 33.518980427533002 ], [ -117.023270577190004, 33.518850768396 ], [ -117.023292034860006, 33.518797007232997 ], [ -117.023235708480001, 33.518708459362003 ], [ -117.023171335460006, 33.518683159954001 ], [ -117.023120373490002, 33.518765383004002 ], [ -117.023080140350004, 33.518907691942999 ], [ -117.023023813959995, 33.518993077194999 ], [ -117.022970169779995, 33.519081624774003 ], [ -117.022972851990005, 33.519255557255001 ], [ -117.023010402919994, 33.519337779760001 ], [ -117.023045271640001, 33.519438976582997 ], [ -117.02309086919, 33.519413677388002 ] ] ] } }
  ]
}

# Load the GeoJSON for further parsing
data = json.loads(json.dumps(geojson))
aois = []

# Output an array of strings containing the geometry of each AOI
for feature in data['features']:
    aois.append(str(feature['geometry']['coordinates']))

# Correct the geometry data format and outputs a valid GeoJSON dictionary (json.loads can be skipped to get strings)
for idx, aoi in enumerate(aois):
    aois[idx] = '{"type":"Polygon","coordinates":' + aoi + '}'
    aois[idx] = json.loads(aois[idx])

# Create a buffer around the AOI to mitigate for S2COGReader not reading all pixels on the edges
buffer = shape(aois[0]).buffer(0.00001)
buffer = json.dumps(shapely.geometry.mapping(buffer))
print(buffer)
print(type(buffer)) # If string, need to be converted to dictionary with json.loads

#geom = aois[0] # Old method for testing
geom = json.loads(buffer) # Convert the buffer from string to dictionary

# Perform a STAC search with the parameters below
search = Search(
    url='https://earth-search.aws.element84.com/v0',
    collections=['sentinel-s2-l2a-cogs'],
    intersects=geom,
    query={'eo:cloud_cover': {'lt': 20}},
    datetime='2021-02-01T00:00:00Z/2021-04-30T23:59:59Z'
)

if search.found() == 0:
    raise Exception("Error: no matching item found")

print('bbox + time + cloud cover search: %s items' % search.found())

# Order the items by date and limit the results
items = search.items(limit=10)

# Select the ID of the most recent image
print(items.summary(['date', 'id', 'eo:cloud_cover']))
sum = items.summary(['id'])
id_latest_img = sum[35:65] # THIS PART NEEDS TO BE MODIFIED DEPENDING ON THE SEARCH OR AUTOMATED
id_latest_img = id_latest_img.strip() # If line above is automated, then no need to remove whitespaces before and after
print("id_latest_img", id_latest_img)

with S2COGReader(id_latest_img) as s2:
    # Loads the scene from AWS and apply the selected formula directly
    # Print statements can be deleted
    print("type(s2)", type(s2))
    print("s2.bands", s2.bands)
    print("type(s2.stac_item)", type(s2.stac_item))
    scene = s2.feature(geom, expression=formula)

img = scene # Also possible to replace img by scene in the code below... obviously

# Print the resulting image with metadata
print('img shape (height, width, length):', img.data.shape, '/ img CRS:', img.crs)
#print(img.data[0])
imshow(img.data[0],cmap="YlGnBu")

print("dtype", img.data.dtype)

# Mask out nodata (0) values: non-masked array will be in img and masked array will be in img_processed 
img_processed = np.ma.masked_array(img.data[0], img.data[0] == 0)

# Calculate image statistics (NO MASKING OF NODATA)
# range_min = img.data.min()
# range_max = img.data.max()
# mean = numpy.mean(img.data[0])
# median = numpy.median(img.data[0])
# stdev = numpy.std(img.data[0])
# print("range_min", range_min)
# print("range_max", range_max)
# print("mean", mean)
# print("median", median)
# print("stdev", stdev)

# Calculate image statistics
range_min = img_processed.min()
range_max = img_processed.max()
mean = numpy.mean(img_processed)
median = numpy.median(img_processed)
stdev = numpy.std(img_processed)
print("range_min", range_min)
print("range_max", range_max)
print("mean", mean)
print("median", median)
print("stdev", stdev)

# Testing calculation with float32 // actually useless because the conversion should happen earlier
img_processed = img_processed.astype('float32')

# Calculate image statistics
range_min = img_processed.min()
range_max = img_processed.max()
mean = numpy.mean(img_processed)
median = numpy.median(img_processed)
stdev = numpy.std(img_processed)
print("range_min", range_min)
print("range_max", range_max)
print("mean", mean)
print("median", median)
print("stdev", stdev)