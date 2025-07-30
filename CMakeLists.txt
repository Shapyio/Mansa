cmake_minimum_required(VERSION 3.14)
project(mansa)

set(CMAKE_CXX_STANDARD 17)

# Source files
file(GLOB_RECURSE SOURCES CONFIGURE_DEPENDS "src/*.cpp")
include_directories(include)

add_executable(mansa ${SOURCES})