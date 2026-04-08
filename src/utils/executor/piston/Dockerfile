# Stage 1: Build Isolate
FROM buildpack-deps:bullseye AS isolate
RUN apt-get update && \
    apt-get install -y --no-install-recommends git libcap-dev && \
    rm -rf /var/lib/apt/lists/* && \
    git clone https://github.com/envicutor/isolate.git /tmp/isolate/ && \
    cd /tmp/isolate && \
    git checkout af6db68042c3aa0ded80787fbb78bc0846ea2114 && \
    make -j$(nproc) install && \
    rm -rf /tmp/*

# Stage 2: Final Image
FROM node:16-bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN dpkg-reconfigure -p critical dash
RUN apt-get update && \
    apt-get install -y libxml2 gnupg tar coreutils util-linux libc6-dev \
    binutils build-essential locales libpcre3-dev libevent-dev libgmp3-dev \
    libncurses6 libncurses5 libedit-dev libseccomp-dev rename procps python3 \
    libreadline-dev libblas-dev liblapack-dev libpcre3-dev libarpack2-dev \
    libfftw3-dev libglpk-dev libqhull-dev libqrupdate-dev libsuitesparse-dev \
    libsundials-dev libpcre2-dev libcap-dev curl && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -M piston
COPY --from=isolate /usr/local/bin/isolate /usr/local/bin
COPY --from=isolate /usr/local/etc/isolate /usr/local/etc/isolate

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

WORKDIR /piston

# Copy API
COPY core/api ./core/api
RUN cd core/api && npm install

# Copy CLI (needed for automatic package installation)
COPY core/cli ./core/cli
RUN cd core/cli && npm install

# Copy entrypoint script
COPY scripts/entrypoint.sh .
RUN chmod +x entrypoint.sh && sed -i 's/\r$//' entrypoint.sh

# Environment setup
ENV PISTON_DATA_DIRECTORY=/piston/data
VOLUME /piston/data

EXPOSE 2000

ENTRYPOINT ["/piston/entrypoint.sh"]
