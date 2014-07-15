.PHONY: clean

build/echo-chamber.min.js: build/echo-chamber.js build
	./node_modules/.bin/uglifyjs $< > $@

build/echo-chamber.js: index.js build
	browserify -o $@ -s EchoChamber $<

build:
	mkdir -p build

clean:
	rm -rf build