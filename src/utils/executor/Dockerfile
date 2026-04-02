FROM ruby:2.7.8-slim-bullseye

# Install language toolchains and core dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      git \
      libcap-dev \
      libffi-dev \
      libpq-dev \
      libyaml-dev \
      libzmq3-dev \
      pkg-config \
      postgresql-client \
      redis-tools \
      shared-mime-info \
      sudo \
      unzip \
      python3 \
      python3-pip \
      gcc \
      g++ \
      clang \
      nodejs \
      npm \
      && rm -rf /var/lib/apt/lists/*

# Install TypeScript compiler and Node.js types
RUN npm install -g typescript@3.7.4 @types/node@12

# Create tsc-wrapper to include global types
RUN echo '#!/bin/bash\n/usr/local/bin/tsc --skipLibCheck --typeRoots /usr/local/lib/node_modules/@types "$@"' > /usr/local/bin/tsc-wrapper && \
    chmod +x /usr/local/bin/tsc-wrapper

# Create symlinks for all languages to match Judge0 DB default paths
RUN mkdir -p /usr/local/python-3.8.1/bin && \
    ln -s /usr/bin/python3 /usr/local/python-3.8.1/bin/python3 && \
    mkdir -p /usr/local/gcc-9.2.0/bin && \
    ln -s /usr/bin/gcc /usr/local/gcc-9.2.0/bin/gcc && \
    ln -s /usr/bin/g++ /usr/local/gcc-9.2.0/bin/g++ && \
    mkdir -p /usr/local/node-12.14.0/bin && \
    ln -s /usr/bin/node /usr/local/node-12.14.0/bin/node && \
    ln -sf /usr/bin/clang++ /usr/bin/clang++-7 && \
    ln -sf /usr/local/bin/tsc-wrapper /usr/bin/tsc

# Install isolate (v1.8.1)
RUN curl -L https://github.com/judge0/isolate/archive/refs/tags/v1.8.1.tar.gz -o isolate.tar.gz && \
    tar -xzf isolate.tar.gz && \
    cd isolate-1.8.1 && \
    make install && \
    cd .. && \
    rm -rf isolate-1.8.1 isolate.tar.gz

# Download Judge0 source
WORKDIR /app
RUN curl -L https://github.com/judge0/judge0/archive/refs/tags/v1.13.1.tar.gz -o judge0.tar.gz && \
    tar -xzf judge0.tar.gz --strip-components=1 && \
    rm judge0.tar.gz

# Install gems
RUN bundle install

# Patch IsolateJob to honor CGROUP_MANAGEMENT
RUN sed -i 's/@cgroups = (!submission.enable_per_process_and_thread_time_limit || !submission.enable_per_process_and_thread_memory_limit) ? "--cg" : ""/@cgroups = (ENV["CGROUP_MANAGEMENT"] == "true" \&\& (!submission.enable_per_process_and_thread_time_limit || !submission.enable_per_process_and_thread_memory_limit)) ? "--cg" : ""/' /app/app/jobs/isolate_job.rb && \
    sed -i 's/#{cgroups.present? ? "--no-cg-timing" : ""}/#{cgroups == "--cg" ? "--no-cg-timing" : ""}/g' /app/app/jobs/isolate_job.rb && \
    sed -i 's/: "--cg-timing"/: (cgroups == "--cg" ? "--cg-timing" : "")/g' /app/app/jobs/isolate_job.rb && \
    sed -i 's/: "--cg-mem="/: (cgroups == "--cg" ? "--cg-mem=" : "-m ")/g' /app/app/jobs/isolate_job.rb

# Expose port
EXPOSE 2358

# Default command
CMD ["./scripts/server"]
